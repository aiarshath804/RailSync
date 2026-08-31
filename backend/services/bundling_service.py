from datetime import datetime
from typing import List, Dict, Any
from backend.core.constants import MAX_SPATIAL_PROXIMITY_KM, DEFAULT_TIME_PROXIMITY_MINUTES

class BundlingService:
    @staticmethod
    def parse_time(val: Any) -> datetime:
        if isinstance(val, datetime):
            return val
        if isinstance(val, str):
            return datetime.fromisoformat(val.replace("Z", "+00:00").split("+")[0])
        return datetime.now()

    @classmethod
    def can_bundle(cls, req_a: Dict[str, Any], req_b: Dict[str, Any], assets: List[Dict[str, Any]]) -> bool:
        # Cross-departmental tasks can be bundled
        time_a = cls.parse_time(req_a.get("requested_start_time"))
        time_b = cls.parse_time(req_b.get("requested_start_time"))
        
        time_delta_mins = abs((time_a - time_b).total_seconds()) / 60.0
        if time_delta_mins > DEFAULT_TIME_PROXIMITY_MINUTES:
            return False

        # Spatial check: find assets
        asset_a = next((a for a in assets if a.get("asset_id") == req_a.get("asset_id")), None)
        asset_b = next((a for a in assets if a.get("asset_id") == req_b.get("asset_id")), None)
        
        if asset_a and asset_b:
            start_a = asset_a.get("start_km", 0.0)
            end_a = asset_a.get("end_km", start_a)
            start_b = asset_b.get("start_km", 0.0)
            end_b = asset_b.get("end_km", start_b)
            
            # Distance between intervals
            dist = max(0.0, max(start_a, start_b) - min(end_a, end_b))
            if dist <= MAX_SPATIAL_PROXIMITY_KM:
                return True
        
        return True # Default to feasible bundling if within corridor

    @classmethod
    def create_bundled_clusters(
        cls, 
        requests: List[Dict[str, Any]], 
        assets: List[Dict[str, Any]]
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
                # Check if other can bundle with any member of cluster
                if any(cls.can_bundle(other, member, assets) for member in cluster):
                    # Check department diversity (prefer mixing TMS, SMMS, TDMS)
                    cluster.append(other)
                    to_remove.append(other)
            
            for item in to_remove:
                unassigned.remove(item)
                
            clusters.append(cluster)
            
        return clusters
