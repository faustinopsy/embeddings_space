<?php

class MicroVectorDB {
    private array $storage = [];

    /**
     * Adiciona um documento e seu vetor ao banco.
     * @param string $id Identificador único
     * @param array $vector O embedding (ex: [0.12, -0.5, ...])
     * @param mixed $payload Dados extras (texto original, metadados)
     */
    public function add(string $id, array $vector, $payload = null): void {
        $this->storage[$id] = [
            'vector' => $vector,
            'payload' => $payload,
            'magnitude' => $this->calculateMagnitude($vector)
        ];
    }

    /**
     * Busca os K vizinhos mais próximos (K-Nearest Neighbors)
     */
    public function search(array $queryVector, int $k = 3): array {
        $queryMagnitude = $this->calculateMagnitude($queryVector);
        $scores = [];

        foreach ($this->storage as $id => $data) {
            $storedVector = $data['vector'];
            $storedMagnitude = $data['magnitude'];

            if ($queryMagnitude * $storedMagnitude == 0) {
                $scores[$id] = 0;
                continue;
            }

            // Cálculo do Produto Escalar (Dot Product)
            $dotProduct = 0;
            $count = count($queryVector); 
            for ($i = 0; $i < $count; $i++) {
                $dotProduct += $queryVector[$i] * $storedVector[$i];
            }

            // Fórmula da Similaridade de Cosseno
            $similarity = $dotProduct / ($queryMagnitude * $storedMagnitude);
            $scores[$id] = $similarity;
        }

        // Ordenar do maior score (mais similar) para o menor
        arsort($scores);
        // Retornar os top K resultados
        $results = [];
        $topIds = array_slice(array_keys($scores), 0, $k);
        
        foreach ($topIds as $id) {
            $results[] = [
                'id' => $id,
                'score' => $scores[$id],
                'payload' => $this->storage[$id]['payload']
            ];
        }

        return $results;
    }

    private function calculateMagnitude(array $vector): float {
        $sum = 0;
        foreach ($vector as $val) {
            $sum += $val * $val;
        }
        return sqrt($sum);
    }
}


// 1. Inicializar
$db = new MicroVectorDB();

// 2. Popular com dados (Vetores fictícios simplificados 3D)
// Num cenário real, esses vetores viriam da OpenAI/Ollama com 1536 ou 768 dimensões
$db->add("doc1", [1, 0, 0], "Como fazer café"); // Vetor aponta para X
$db->add("doc2", [0, 1, 0], "Como fritar ovo"); // Vetor aponta para Y
$db->add("doc3", [0.9, 0.1, 0], "Receita de café expresso"); // Muito perto de doc1

// 3. Fazer uma busca (Pergunta: "Quero café")
// Suponha que o vetor da pergunta seja [0.95, 0.05, 0]
$query = [0.95, 0.05, 0]; 

$resultados = $db->search($query, 2);

echo "Resultados da busca:\n";
print_r($resultados);
?>