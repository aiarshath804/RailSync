from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.core.constants import MAX_SPATIAL_PROXIMITY_KM, DEFAULT_TIME_PROXIMITY_MINUTES
from backend.services.safety_guardrail_service import SafetyGuardrailService

class BundlingService:
    @staticmethod
    def parse_time(val: Any) -> datetime:
        return SafetyGuardrailService.parse_time(val)

    @classmethod
    def can_bundle(cls, req_a: Dict[str, Any], req_b: Dict[str, Any], assets: Optional[List[Dict[str, Any]]] = None) -> bool:
        """
        Determines whether two maintenance requests can be safely bundled together:
        Enforces both spatial/temporal proximity and authoritative railway safety compatibility rules.
        """
        # 1. Temporal check
        time_a = cls.parse_time(req_a.get("requested_start_time"))
        time_b = cls.parse_time(req_b.get("requested_start_time"))
        
        time_delta_mins = abs((time_a - time_b).total_seconds()) / 60.0
        if time_delta_mins > DEFAULT_TIME_PROXIMITY_MINUTES:
            return False

        # 2. Spatial lookup
        asset_a = next((a for a in (assets or []) if a.get("asset_id") == req_a.get("asset_id")), None)
        asset_b = next((a for a in (assets or []) if a.get("asset_id") == req_b.get("asset_id")), None)
        
        if asset_a and asset_b:
            start_a = float(asset_a.get("start_km", 0.0))
            end_a = float(asset_a.get("end_km", start_a))
            start_b = float(asset_b.get("start_km", 0.0))
            end_b = float(asset_b.get("end_km", start_b))
            
            dist = max(0.0, max(start_a, start_b) - min(end_a, end_b))
            if dist > MAX_SPATIAL_PROXIMITY_KM:
                return False

        # 3. Authoritative Safety Compatibility Check
        safety_compat = SafetyGuardrailService.check_bundle_compatibility(
            req_a, req_b, asset_a=asset_a, asset_b=asset_b
        )
        return safety_compat["is_compatible"]

    @classmethod
    def create_bundled_clusters(
        cls, 
        requests: List[Dict[str, Any]], 
        assets: Optional[List[Dict[str, Any]]] = None
    ) -> List[List[Dict[str, Any]]]:
        if not requests:
            return []
            
        unassigned = list(requests)
        clusters: List[List[Dict[str, Any]]] = []
        
        while unassigned:
            seed = unassigned.pop(0)
            cluster = [seed]
            to_remove = []
            
            for other in unassigned:
                # Check if other can bundle safely with all existing members of cluster
                if all(cls.can_bundle(other, member, assets) for member in cluster):
                    cluster.append(other)
                    to_remove.append(other)
            
            for item in to_remove:
                unassigned.remove(item)
                
            clusters.append(cluster)
            
        return clusters
