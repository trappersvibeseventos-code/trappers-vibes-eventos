require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.post("/perguntar", async (req, res) => {

    try {

        const pergunta = req.body.pergunta;

        if (!pergunta) {
            return res.status(400).json({
                erro: "Escreve uma pergunta."
            });
        }

        const resposta = await client.responses.create({
model: "gpt-5.6-luna",            instructions:
                "És a TRAPPERS IA, assistente especializada em música, Rap, Trap, produção musical, carreira artística, marketing musical e cultura urbana. Responde em português de forma clara, útil e profissional.",
            input: pergunta
        });

        res.json({
            resposta: resposta.output_text
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: "Não foi possível obter uma resposta da TRAPPERS IA."
        });

    }

});

app.get("/", (req, res) => {
    res.send("TRAPPERS IA está online 🤖🔥");
});

const PORTA = process.env.PORT || 3000;

app.listen(PORTA, () => {
    console.log(`TRAPPERS IA online em http://127.0.0.1:${PORTA}`);
});
