const localVectorDB = {
    embeddings: [],
    
    add: function(text, vector) {
        const id = 'doc_' + this.embeddings.length;
        this.embeddings.push({ id, text, vector, reducedVector: [] });
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

    getAll: function() {
        return this.embeddings;
    },

    clear: function() {
        this.embeddings = [];
    }
};
export {localVectorDB};