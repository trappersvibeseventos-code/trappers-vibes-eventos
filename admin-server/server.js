const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
require("./noticias-routes")(app);
const PORT = process.env.PORT || 3001;

const DATA_FILE = path.join(__dirname, "data", "trabalhos.json");

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const publicPaths = req.method === "GET" || req.path === "/admin/login" || req.path === "/";
  if (publicPaths) return next();

  const auth = req.headers.authorization || "";
  const expected = process.env.ADMIN_PASSWORD || "";

  if (!auth.startsWith("Bearer ") || auth.slice(7) !== expected) {
    return res.status(401).json({ sucesso: false, mensagem: "Não autorizado." });
  }

  next();
});

app.use(express.static("/data/data/com.termux/files/home/trappers-vibes"));

app.post("/admin/login", (req, res) => {
  const senha = req.body.senha || "";
  const senhaCorreta = process.env.ADMIN_PASSWORD || "";

  const a = Buffer.from(senha);
  const b = Buffer.from(senhaCorreta);

  const correta =
    a.length === b.length &&
    crypto.timingSafeEqual(a, b);

  if (!correta) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Senha incorreta."
    });
  }

  res.json({
    sucesso: true,
    mensagem: "Login autorizado."
  });
});



function lerDados() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { trabalhos: [] };
  }
}

function guardarDados(dados) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(dados, null, 2));
}

app.get("/", (req, res) => {
  res.json({
    sistema: "TRAPPERS VIBES EVENTOS",
    status: "online"
  });
});

app.get("/trabalhos/:codigo", (req, res) => {
  const dados = lerDados();

  const trabalho = dados.trabalhos.find(
    item => item.codigo.toUpperCase() === req.params.codigo.toUpperCase()
  );

  if (!trabalho) {
    return res.status(404).json({
      sucesso: false,
      mensagem: "Código não encontrado."
    });
  }

  res.json({
    sucesso: true,
    trabalho
  });
});

app.get("/trabalhos", (req, res) => {
  const dados = lerDados();
  res.json(dados);
});

app.post("/trabalhos", (req, res) => {
  const dados = lerDados();

  const novoTrabalho = {
    codigo: req.body.codigo,
    cliente: req.body.cliente,
    servico: req.body.servico,
    estado: req.body.estado || "Recebido",
    progresso: Number(req.body.progresso) || 0,
    responsavel: req.body.responsavel || "TRAPPERS VIBES EVENTOS",
    ultimaAtualizacao: req.body.ultimaAtualizacao || new Date().toLocaleDateString("pt-AO"),
    observacoes: req.body.observacoes || ""
  };

  if (!novoTrabalho.codigo || !novoTrabalho.cliente || !novoTrabalho.servico) {
    return res.status(400).json({
      sucesso: false,
      mensagem: "Código, cliente e serviço são obrigatórios."
    });
  }

  const existe = dados.trabalhos.some(
    item => item.codigo.toUpperCase() === novoTrabalho.codigo.toUpperCase()
  );

  if (existe) {
    return res.status(409).json({
      sucesso: false,
      mensagem: "Esse código já existe."
    });
  }

  dados.trabalhos.push(novoTrabalho);
  guardarDados(dados);

  res.status(201).json({
    sucesso: true,
    mensagem: "Trabalho criado com sucesso.",
    trabalho: novoTrabalho
  });
});

app.put("/trabalhos/:codigo", (req, res) => {
  const dados = lerDados();

  const indice = dados.trabalhos.findIndex(
    item => item.codigo.toUpperCase() === req.params.codigo.toUpperCase()
  );

  if (indice === -1) {
    return res.status(404).json({
      sucesso: false,
      mensagem: "Código não encontrado."
    });
  }

  dados.trabalhos[indice] = {
    ...dados.trabalhos[indice],
    ...req.body,
    codigo: dados.trabalhos[indice].codigo,
    ultimaAtualizacao: new Date().toLocaleDateString("pt-AO")
  };

  guardarDados(dados);

  res.json({
    sucesso: true,
    mensagem: "Trabalho atualizado com sucesso.",
    trabalho: dados.trabalhos[indice]
  });
});

app.delete("/trabalhos/:codigo", (req, res) => {
  const dados = lerDados();

  const quantidadeAntes = dados.trabalhos.length;

  dados.trabalhos = dados.trabalhos.filter(
    item => item.codigo.toUpperCase() !== req.params.codigo.toUpperCase()
  );

  if (dados.trabalhos.length === quantidadeAntes) {
    return res.status(404).json({
      sucesso: false,
      mensagem: "Código não encontrado."
    });
  }

  guardarDados(dados);

  res.json({
    sucesso: true,
    mensagem: "Trabalho eliminado com sucesso."
  });
});


const ARTISTAS_FILE = path.join(__dirname, "data", "artistas.json");

function lerArtistas() {
    if (!fs.existsSync(ARTISTAS_FILE)) {
        fs.writeFileSync(ARTISTAS_FILE, JSON.stringify({ artistas: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(ARTISTAS_FILE, "utf8"));
}

function guardarArtistas(dados) {
    fs.writeFileSync(ARTISTAS_FILE, JSON.stringify(dados, null, 2));
}

app.get("/artistas", (req, res) => {
    try {
        res.json(lerArtistas());
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao carregar artistas." });
    }
});

app.post("/artistas", (req, res) => {
    try {
        const dados = lerArtistas();
        const artista = req.body;

        if (!artista.nome || !artista.nome.trim()) {
            return res.status(400).json({ erro: "O nome do artista é obrigatório." });
        }

        const novoArtista = {
            id: Date.now().toString(),
            nome: artista.nome.trim(),
            descricao: (artista.descricao || "").trim(),
            imagem: (artista.imagem || "").trim(),
            instagram: (artista.instagram || "").trim(),
            youtube: (artista.youtube || "").trim(),
            spotify: (artista.spotify || "").trim()
        };

        dados.artistas.push(novoArtista);
        guardarArtistas(dados);

        res.status(201).json({
            sucesso: true,
            artista: novoArtista
        });

    } catch (erro) {
        res.status(500).json({ erro: "Erro ao criar artista." });
    }
});

app.put("/artistas/:id", (req, res) => {
    try {
        const dados = lerArtistas();
        const indice = dados.artistas.findIndex(a => a.id === req.params.id);

        if (indice === -1) {
            return res.status(404).json({ erro: "Artista não encontrado." });
        }

        const atual = dados.artistas[indice];

        dados.artistas[indice] = {
            ...atual,
            nome: (req.body.nome || "").trim(),
            descricao: (req.body.descricao || "").trim(),
            imagem: (req.body.imagem || "").trim(),
            instagram: (req.body.instagram || "").trim(),
            youtube: (req.body.youtube || "").trim(),
            spotify: (req.body.spotify || "").trim()
        };

        guardarArtistas(dados);

        res.json({
            sucesso: true,
            artista: dados.artistas[indice]
        });

    } catch (erro) {
        res.status(500).json({ erro: "Erro ao atualizar artista." });
    }
});

app.delete("/artistas/:id", (req, res) => {
    try {
        const dados = lerArtistas();
        const indice = dados.artistas.findIndex(a => a.id === req.params.id);

        if (indice === -1) {
            return res.status(404).json({ erro: "Artista não encontrado." });
        }

        dados.artistas.splice(indice, 1);
        guardarArtistas(dados);

        res.json({
            sucesso: true,
            mensagem: "Artista removido com sucesso."
        });

    } catch (erro) {
        res.status(500).json({ erro: "Erro ao remover artista." });
    }
});

const SERVICOS_FILE = path.join(__dirname, "data", "servicos.json");

function lerServicos() {
    if (!fs.existsSync(SERVICOS_FILE)) {
        fs.writeFileSync(SERVICOS_FILE, JSON.stringify({ servicos: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(SERVICOS_FILE, "utf8"));
}

function guardarServicos(dados) {
    fs.writeFileSync(SERVICOS_FILE, JSON.stringify(dados, null, 2));
}

app.get("/servicos", (req, res) => {
    try {
        res.json(lerServicos());
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao carregar serviços." });
    }
});

app.post("/servicos", (req, res) => {
    try {
        const dados = lerServicos();
        const servico = req.body;

        if (!servico.nome || !servico.nome.trim()) {
            return res.status(400).json({ erro: "O nome do serviço é obrigatório." });
        }

        const novoServico = {
            id: Date.now().toString(),
            categoria: (servico.categoria || "").trim(),
            nome: servico.nome.trim(),
            descricao: (servico.descricao || "").trim(),
            preco: (servico.preco || "").trim(),
            whatsapp: (servico.whatsapp || "").trim()
        };

        dados.servicos.push(novoServico);
        guardarServicos(dados);

        res.status(201).json({
            sucesso: true,
            servico: novoServico
        });

    } catch (erro) {
        res.status(500).json({ erro: "Erro ao criar serviço." });
    }
});

app.put("/servicos/:id", (req, res) => {
    try {
        const dados = lerServicos();
        const indice = dados.servicos.findIndex(s => s.id === req.params.id);

        if (indice === -1) {
            return res.status(404).json({ erro: "Serviço não encontrado." });
        }

        const atual = dados.servicos[indice];

        dados.servicos[indice] = {
            ...atual,
            categoria: (req.body.categoria || "").trim(),
            nome: (req.body.nome || "").trim(),
            descricao: (req.body.descricao || "").trim(),
            preco: (req.body.preco || "").trim(),
            whatsapp: (req.body.whatsapp || "").trim()
        };

        guardarServicos(dados);

        res.json({
            sucesso: true,
            servico: dados.servicos[indice]
        });

    } catch (erro) {
        res.status(500).json({ erro: "Erro ao atualizar serviço." });
    }
});

app.delete("/servicos/:id", (req, res) => {
    try {
        const dados = lerServicos();
        const indice = dados.servicos.findIndex(s => s.id === req.params.id);

        if (indice === -1) {
            return res.status(404).json({ erro: "Serviço não encontrado." });
        }

        dados.servicos.splice(indice, 1);
        guardarServicos(dados);

        res.json({
            sucesso: true,
            mensagem: "Serviço removido com sucesso."
        });

    } catch (erro) {
        res.status(500).json({ erro: "Erro ao remover serviço." });
    }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TRAPPERS VIBES ADMIN online em http://0.0.0.0:${PORT}`);
});
