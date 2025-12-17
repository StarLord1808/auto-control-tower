"""
Test script to verify Flask API and database connection
"""
from os import path
import sys

# Ensure backend module is importable if running directly
if __name__ == '__main__':
    sys.path.append(path.abspath(path.join(path.dirname(__file__), '../../')))

from backend.shared.db.database import get_db_context, engine
from backend.shared.db.models import Shipment, RiskEvent, Customer, Carrier
from sqlalchemy import text

def test_database_connection():
    """Test database connection"""
    print("Testing database connection...")
    try:
        with get_db_context() as db:
            result = db.execute(text('SELECT 1'))
            print("✓ Database connection successful!")
            return True
    except Exception as e:
        print(f"✗ Database connection failed: {str(e)}")
        return False

def test_table_counts():
    """Test table counts"""
    print("\nChecking table counts...")
    try:
        with get_db_context() as db:
            tables = [
                ('carriers', 'carrier_id'),
                ('customers', 'customer_id'),
                ('ports', 'port_id'),
                ('vessels', 'vessel_id'),
                ('erp_orders', 'order_id'),
                ('shipments', 'shipment_id'),
                ('risk_events', 'event_id'),
                ('agent_decisions', 'decision_id'),
                ('mitigation_actions', 'action_id'),
                ('stakeholder_communications', 'communication_id'),
                ('operational_metrics', 'metric_id'),
                ('wms_inventory', 'inventory_id'),
                ('tms_plans', 'plan_id'),
                ('mes_production', 'production_id'),
                ('oms_lifecycle', 'lifecycle_id'),
                ('crm_interactions', 'interaction_id'),
                ('traffic_data', 'traffic_id'),
                ('port_congestion', 'congestion_id'),
                ('alternative_routes', 'route_id'),
                ('shipments_erp_orders', 'shipment_id'),
                ('shipments_tms_plans', 'shipment_id'),
                ('shipments_wms_inventory', 'shipment_id'),
            ]
            
            total_count = 0
            for table_name, id_field in tables:
                count = db.execute(text(f'SELECT COUNT({id_field}) FROM {table_name}')).scalar()
                print(f"  {table_name:30s}: {count:6d} records")
                total_count += count
            
            print(f"\n✓ Total records across all tables: {total_count}")
            return True
    except Exception as e:
        print(f"✗ Error counting tables: {str(e)}")
        return False

def test_sample_queries():
    """Test sample queries using SQLAlchemy models"""
    print("\nTesting sample queries...")
    try:
        with get_db_context() as db:
            # Test shipments
            shipment_count = db.query(Shipment).count()
            print(f"  Total shipments: {shipment_count}")
            
            # Test at-risk shipments
            at_risk = db.query(Shipment).filter(Shipment.status == 'at_risk').count()
            print(f"  At-risk shipments: {at_risk}")
            
            # Test risk events
            risk_count = db.query(RiskEvent).count()
            print(f"  Total risk events: {risk_count}")
            
            # Test customers
            customer_count = db.query(Customer).count()
            print(f"  Total customers: {customer_count}")
            
            # Test carriers
            carrier_count = db.query(Carrier).count()
            print(f"  Total carriers: {carrier_count}")
            
            print("\n✓ Sample queries executed successfully!")
            return True
    except Exception as e:
        print(f"✗ Error executing queries: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("Flask API Database Connection Test")
    print("=" * 60)
    
    results = []
    results.append(test_database_connection())
    
    if results[0]:  # Only proceed if connection successful
        results.append(test_table_counts())
        results.append(test_sample_queries())
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ All tests passed!")
        print("=" * 60)
        return 0
    else:
        print("✗ Some tests failed")
        print("=" * 60)
        return 1

if __name__ == '__main__':
    exit(main())
