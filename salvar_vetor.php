<?php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(["status" => "erro", "msg" => "Dados inválidos"]);
    exit;
}

$textoOriginal = $input['conteudo'];
$vetor = $input['vetor'];

if (count($vetor) !== 384) {
    echo json_encode(["status" => "erro", "msg" => "Dimensão do vetor incorreta"]);
    exit;
}

$registro = [
    'id' => uniqid(),
    'texto' => $textoOriginal,
    'vetor' => $vetor 
];

file_put_contents('banco_vetores.json', json_encode($registro) . "\n", FILE_APPEND);

echo json_encode([
    "status" => "sucesso", 
    "msg" => "Vetor de 384 dimensões recebido e armazenado.",
    "amostra_vetor" => array_slice($vetor, 0, 5)
]);
?>