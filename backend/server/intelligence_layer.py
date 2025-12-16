import json
import os
import time
from typing import Dict, List, Optional
from langchain_community.chat_models import ChatOpenAI
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import HumanMessage, SystemMessage

# Import Circuit Breaker and Learning Engine
from circuit_breaker import CircuitBreaker, call_with_circuit_breaker
from learning_engine import recommend_confidence_adjustment
from llm_health import log_health_metrics, get_llm_status
from prompts_constants import RISK_ANALYSIS_SYSTEM_PROMPT, MITIGATION_SYSTEM_PROMPT

class IntelligenceLayer:
    def __init__(self):
        # 1. Mistral AI (Primary)
        self.mistral_key = os.getenv("MISTRAL_API_KEY")
        if self.mistral_key:
            self.mistral_client = ChatMistralAI(
                model="mistral-large-latest", 
                temperature=0.2,
                max_retries=0
            )
        else:
            print("WARNING: MISTRAL_API_KEY not found.")
            self.mistral_client = None

        # 2. OpenAI (Fallback)
        self.openai_key = os.getenv("OPENAI_API_KEY")
        if self.openai_key:
            # Disable retries to fail fast on 429s -> Fallback to mock
            self.openai_client = ChatOpenAI(
                model="gpt-4o", 
                temperature=0.2, 
                max_retries=0
            )
        else:
            print("WARNING: OPENAI_API_KEY not found.")
            self.openai_client = None

        # Initialize Circuit Breakers
        self.cb_mistral = CircuitBreaker("mistral_ai", failure_threshold=3, timeout_seconds=60)
        self.cb_openai = CircuitBreaker("openai", failure_threshold=3, timeout_seconds=60)
        
        # Log initial health status
        status = get_llm_status()
        log_health_metrics(status)

    def _invoke_llm(self, messages, context: Optional[Dict] = None):
        """
        Try Mistral -> OpenAI -> Mock Fallback
        Uses Circuit Breaker pattern for fault tolerance
        """
        errors = []
        
        # 1. Try Mistral
        if self.mistral_client:
            try:
                def call_mistral():
                    return self.mistral_client.invoke(messages)
                    
                response = call_with_circuit_breaker(self.cb_mistral, call_mistral)
                return response
            except Exception as e:
                errors.append(f"Mistral Error: {str(e)}")
                # Continue to fallback
        
        # 2. Try OpenAI (Fallback 1)
        if self.openai_client:
            try:
                def call_openai():
                    return self.openai_client.invoke(messages)
                    
                response = call_with_circuit_breaker(self.cb_openai, call_openai)
                return response
            except Exception as e:
                errors.append(f"OpenAI Error: {str(e)}")
                # Continue to fallback
        
        # 3. Graceful Degradation (Mock Response)
        print(f"All LLMs failed/unavailable. Using fallback. Errors: {'; '.join(errors)}")
        return self._get_fallback_response(messages, context)

    def _get_fallback_response(self, messages, context):
        """Generate a structured mock response when all LLMs fail"""
        # Determine intent from messages
        system_msg = next((m.content for m in messages if isinstance(m, SystemMessage)), "")
        
        if "Analyze the following supply chain risk" in system_msg:
            return type('obj', (object,), {
                'content': json.dumps({
                    "root_cause": "System fallback due to LLM unavailability",
                    "severity": "medium",
                    "impact_analysis": "Unable to calculate precise impact at this time.",
                    "mitigation_suggestion": "Manual review recommended.",
                    "confidence_score": 50,
                    "reasoning": "Automated analysis unavailable."
                })
            })
        elif "Mitigation Strategy" in system_msg:
             return type('obj', (object,), {
                'content': json.dumps({
                    "mitigation_actions": [
                        {
                            "type": "Consult Logistics Manager",
                            "description": "LLM services are down. Please consult logistics manager for manual intervention.",
                            "estimated_cost": 0,
                            "estimated_time_saved": 0,
                            "probability_success": 50
                        }
                    ]
                })
            })
            
        # Default generic response
        return type('obj', (object,), {
            'content': json.dumps({
                "error": "LLM services unavailable",
                "default_action": "Manual Review"
            })
        })

    def _parse_json_response(self, content):
        """
        Robustly parse JSON from LLM response, handling markdown fences and extraneous text.
        """
        try:
            # clean basic markdown
            cleaned = content.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned.replace("```json", "").replace("```", "")
            elif cleaned.startswith("```"):
                cleaned = cleaned.replace("```", "")
            
            # If plain cleanup works
            return json.loads(cleaned, strict=False)
        except json.JSONDecodeError:
            # Try to find the first { or [ and the last } or ]
            try:
                start_idx = cleaned.find('{')
                end_idx = cleaned.rfind('}')
                if start_idx != -1 and end_idx != -1:
                     return json.loads(cleaned[start_idx:end_idx+1], strict=False)
                
                # Check for list
                start_idx = cleaned.find('[')
                end_idx = cleaned.rfind(']')
                if start_idx != -1 and end_idx != -1:
                     return json.loads(cleaned[start_idx:end_idx+1], strict=False)
            except:
                pass
            # Re-raise original error if heuristic fails
            raise

    def analyze_risk(self, risk_event, shipment_context, traffic_context=None):
        """
        Analyze a risk event using the LLM.
        """
        # Construct the context string
        context_str = f"""
        Risk Event: {risk_event.get('description')} (Type: {risk_event.get('risk_type')})
        Shipment ID: {shipment_context.get('shipment_id')}
        Route: {shipment_context.get('origin')} -> {shipment_context.get('destination')}
        Cargo Value: ${shipment_context.get('cargo_value', 0)}
        Customer: {shipment_context.get('customer_name')}
        """

        messages = [
            SystemMessage(content=RISK_ANALYSIS_SYSTEM_PROMPT),
            HumanMessage(content=context_str)
        ]

        try:
            response = self._invoke_llm(messages)
            return self._parse_json_response(response.content)
        except Exception as e:
            print(f"Error in analyze_risk: {e}. Falling back to mock data.")
            return self._get_mock_analysis(risk_event)

    def propose_mitigation(self, risk_event, shipment_context):
        """
        Propose mitigation actions.
        """
        prompt_filled = MITIGATION_SYSTEM_PROMPT.format(
            risk_description=risk_event.get('description'),
            delay_hours=risk_event.get('delay_hours', 24),
            origin=shipment_context.get('origin'),
            destination=shipment_context.get('destination'),
            current_location=shipment_context.get('current_location', 'unknown')
        )

        messages = [
            SystemMessage(content=prompt_filled),
            HumanMessage(content="Please generate mitigation options.")
        ]

        try:
            response = self._invoke_llm(messages)
            return self._parse_json_response(response.content)
        except Exception as e:
            print(f"Error in propose_mitigation: {e}. Falling back to mock data.")
            return self._get_mock_mitigation()

    def predict_risks(self, congestion_data):
        """
        Predict risks based on congestion and traffic data.
        """
        # Simple heuristic prompt as this is a new capability
        prompt = f"""
        Analyze the following port congestion data and predict potential supply chain risks.
        Data: {json.dumps(congestion_data, default=str)}
        
        Return a JSON list of objects with:
        - risk_type (string)
        - description (string)
        - severity (low/medium/high)
        - predicted_delay_hours (int)
        """
        
        messages = [
            SystemMessage(content="You are a Predictive Supply Chain Agent. You analyze data patterns to predict future risks."),
            HumanMessage(content=prompt)
        ]

        try:
            response = self._invoke_llm(messages)
            return self._parse_json_response(response.content)
        except Exception as e:
            print(f"Error in predict_risks: {e}")
            return []

    def optimize_mitigation(self, mitigation_plan, shipment_context):
        """
        Find better alternatives for a proposed mitigation.
        """
        prompt = f"""
        Review the following mitigation plan and propose an optimized alternative route/method that might be cheaper or faster.
        Original Plan: {mitigation_plan.get('description')} (Cost: ${mitigation_plan.get('estimated_cost')})
        Context: {shipment_context}
        
        Return a JSON object with:
        - route_description (string)
        - estimated_cost_usd (number)
        - estimated_duration_hours (int)
        - score (0-100)
        """
        
        messages = [
            SystemMessage(content="You are an Optimization Agent. You find the most efficient logistics solutions."),
            HumanMessage(content=prompt)
        ]

        try:
            response = self._invoke_llm(messages)
            return self._parse_json_response(response.content)
        except Exception as e:
            print(f"Error in optimize_mitigation: {e}")
            return None

    def draft_communication(self, decision_summary, recipient_context):
        """
        Draft communication to stakeholders.
        """
        prompt = f"""
        Draft a professional communication message based on the recent decision.
        Decision: {decision_summary}
        Recipient: {recipient_context.get('name')} ({recipient_context.get('type')})
        
        Return a JSON object with:
        - subject (string)
        - message_body (string)
        - priority (string)
        """
        
        messages = [
            SystemMessage(content="You are a Corporate Communications Agent. You write clear, professional updates."),
            HumanMessage(content=prompt)
        ]

        try:
            response = self._invoke_llm(messages)
            return self._parse_json_response(response.content)
        except Exception as e:
            print(f"Error in draft_communication: {e}")
            return None

    def _get_mock_analysis(self, risk_event):
        return {
            "analysis_summary": f"Mock analysis: High impact detected for {risk_event.get('risk_type')} event.",
            "severity_score": 85,
            "confidence_score": 99,
            "reasoning": "Simulated reasoning due to API unavailability."
        }

    def _get_mock_mitigation(self):
        return [
            {
                "action_type": "reroute",
                "description": "Simulated Reroute Action",
                "estimated_cost": 1500,
                "estimated_time_saved": 12,
                "probability": 90
            },
            {
                "action_type": "expedite",
                "description": "Simulated Expedite Action",
                "estimated_cost": 3000,
                "estimated_time_saved": 24,
                "probability": 95
            }
        ]
