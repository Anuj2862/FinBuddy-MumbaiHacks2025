from sentence_transformers import SentenceTransformer, util
from datetime import datetime
import torch
from backend.utils.logger import logger

class VectorMemory:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        # We can potentially share the model instance if passed, but for now load separately
        self.embedder = SentenceTransformer(model_name)
        self.memory = {} # Dict of lists: {user_id: [{'text': str, 'embedding': tensor, 'metadata': dict}]}
        self.limit = 50 # Keep last 50 interactions per user for now
        
    def add_interaction(self, user_id, user_text, bot_response, intent, entities):
        """Store the interaction in memory (user-isolated)"""
        if user_id not in self.memory:
            self.memory[user_id] = []
            
        text = f"User: {user_text} | Bot: {bot_response}"
        embedding = self.embedder.encode(text, convert_to_tensor=True)
        
        entry = {
            "text": text,
            "embedding": embedding,
            "timestamp": datetime.now(),
            "metadata": {
                "user_text": user_text,
                "bot_response": bot_response,
                "intent": intent,
                "entities": entities
            }
        }
        
        self.memory[user_id].append(entry)
        
        # Prune if too large
        if len(self.memory[user_id]) > self.limit:
            self.memory[user_id].pop(0)
            
    def get_context(self, user_id: str, query: str, top_k: int = 3) -> str:
        """Find most similar past interactions for this user."""
        if user_id not in self.memory or not self.memory[user_id]:
            return ""
            
        user_mem = self.memory[user_id]
        query_vec = self.embedder.encode(query, convert_to_tensor=True)
        
        # Simple cosine similarity search
        mem_embeddings = torch.stack([m['embedding'] for m in user_mem])
        cos_scores = util.cos_sim(query_vec, mem_embeddings)[0]
        
        # Get top_k results
        k = min(top_k, len(user_mem))
        top_results = torch.topk(cos_scores, k=k)
        
        results = []
        for score, idx in zip(top_results[0], top_results[1]):
            # Convert tensor to int if necessary
            idx_val = idx.item() if hasattr(idx, 'item') else int(idx)
            
            if score > 0.3: # Lower threshold for relevance
                results.append(user_mem[idx_val]['text'])
                
        return "\n".join(results)
