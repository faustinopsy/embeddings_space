const STORAGE_KEY = 'rag_explorer_data_v1';

const localVectorDB = {
    embeddings: [], 
    
    init: function() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                this.embeddings = JSON.parse(savedData);
                console.log(`[DB] Carregados ${this.embeddings.length} vetores do armazenamento local.`);
            } catch (e) {
                console.error("Erro ao carregar localStorage:", e);
                this.embeddings = [];
            }
        }
    },

    _persist: function() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.embeddings));
        } catch (e) {
            console.error("Quota do LocalStorage excedida!", e);
            alert("Memória cheia! Limpe alguns itens.");
        }
    },
    
    add: function(text, vector) {
        const exists = this.embeddings.find(item => item.text === text);
        if (exists) return exists.id;

        const id = 'doc_' + Date.now();
        this.embeddings.push({ 
            id, 
            text, 
            vector, 
            reducedVector: [] 
        });
        
        this._persist();
        return id;
    },

    getAllVectors: function() {
        return this.embeddings.map(e => e.vector);
    },

    updateReducedVector: function(index, reducedVector) {
        if (this.embeddings[index]) {
            this.embeddings[index].reducedVector = reducedVector;
        }
    },
    
    saveCoords: function() {
        this._persist();
    },

    getAll: function() {
        return this.embeddings;
    },

    clear: function() {
        this.embeddings = [];
        localStorage.removeItem(STORAGE_KEY);
    }
};

localVectorDB.init();

export { localVectorDB };