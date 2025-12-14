import os
import json
from langchain_openai import ChatOpenAI
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
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

    def _invoke_llm(self, messages):
        """
        Try Mistral -> OpenAI -> Raise Exception
        """
        errors = []

        # Attempt 1: Mistral
        if self.mistral_client:
            try:
                print("Attempting analysis with Mistral AI...")
                return self.mistral_client.invoke(messages)
            except Exception as e:
                print(f"Mistral AI failed: {e}")
                errors.append(f"Mistral: {str(e)}")

        # Attempt 2: OpenAI
        if self.openai_client:
            try:
                print("Falling back to OpenAI...")
                return self.openai_client.invoke(messages)
            except Exception as e:
                print(f"OpenAI failed: {e}")
                errors.append(f"OpenAI: {str(e)}")
        
        # If we get here, both failed or neither is configured
        raise Exception(f"All LLM providers failed: {'; '.join(errors)}")

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

    def analyze_risk(self, risk_event, shipment_context):
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
