const express = require('express');
const axios = require('axios');
const multer = require('multer');
const {
  uploadQueue,
  updateUserQueue,
  sendEmailQueue,
  sendProposalToAnaliseQueue,
  sendProposalMailQueue,
} = require('../../lib/Queue');

const multerConfig = require('../../config/multer');
const cities = require('../../../cities.json');

const {
  getToken,
  contaLuzCreateUser,
  contaLuzGetUserIdByPhone,
  contaLuzSendWhatsappMessage,
  contaLuzSendWhatsappFlow,
  sendUserInfoMessage,
  normalizeData,
  sendProposalIDAndLinkMessage,
} = require('../../functions/contaLuz');

const router = express.Router();
const apiCredentials = {};

const delay = 1000 * 20; // 20 seconds

const options = {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

const rendaMap = {
  1: 'Assalariado',
  2: 'Funcionário Público',
  3: 'Aposentado',
  4: 'Pensionista',
  5: 'Autônomo / Sem Vínculo Empregatício',
  6: 'Profissional Liberal',
  7: 'Empresário / Proprietário',
  8: 'Outros',
};

const unidade = {
  nomeVendedor: process.env.NOME_VENDEDOR,
  cpfVendedor: process.env.CPF_VENDEDOR,
  celularVendedor: process.env.CELULAR_VENDEDOR,
};

router.get('/', (req, res) => {
  return res.json({ message: 'conta luz router ok!' });
});

router.post('/user/create', async (req, res) => {
  const { firstName, lastName, phone } = req.body;

  await contaLuzCreateUser({
    first_name: firstName,
    last_name: lastName,
    phone,
  });

  const id = await contaLuzGetUserIdByPhone({ userPhone: phone });

  const messageSend = await contaLuzSendWhatsappMessage({ userID: id });

  if (messageSend) {
    return res.json({ message: 'message sent' });
  }

  res.status(401);
  return res.json({ message: 'unable to send message' });
});

router.post('/user/create-v2', async (req, res) => {
  let value;

  const { firstName, lastName, phone, userMessageObj, offerId } = req.body;

  await contaLuzCreateUser({
    first_name: firstName,
    last_name: lastName,
    phone,
  });

  const id = await contaLuzGetUserIdByPhone({ userPhone: phone });

  const valueAvailable = await contaLuzGetValues({ propostaId: offerId });

  if (valueAvailable.valor) value = valueAvailable.valor;

  const messageSend = await sendUserInfoMessage({
    userID: id,
    messageObj: userMessageObj,
    valueAvailable: value,
  });

  await contaLuzSendWhatsappFlow({ userID: id });

  if (messageSend) {
    return res.json({ message: 'message sent' });
  }

  res.status(401);
  return res.json({ message: 'unable to send message' });
});

router.post('/send-link', async (req, res) => {
  const { firstName, lastName, phone, offerId, page } = req.body;

  await contaLuzCreateUser({
    first_name: firstName,
    last_name: lastName,
    phone,
  });

  const id = await contaLuzGetUserIdByPhone({ userPhone: phone });

  const messageSend = await sendProposalIDAndLinkMessage({
    name: firstName,
    proposalID: offerId,
    userID: id,
    page,
  });

  if (!messageSend) {
    res.status(401);
    return res.json({ message: 'unable to send message' });
  }

  return res.json({ message: 'message sent' });
});

router.get('/token', async (req, res) => {
  try {
    await getToken(apiCredentials);
    return res.json(apiCredentials);
  } catch (error) {
    console.log(error);
    return res.json({ message: 'Unable to Login' });
  }
});

router.post('/citie-available', async (req, res) => {
  const { citieID } = req.body;

  if (!apiCredentials?.token) {
    await getToken(apiCredentials);
  }

  const currentDay = new Date();
  const expiresDay = new Date(apiCredentials.expires);

  if (currentDay >= expiresDay) await getToken(apiCredentials);

  try {
    const { data } = await axios.get(
      `${process.env.CREFAZ_BASE_URL}/api/proposta/produtos-regiao/${citieID}`,
      {
        headers: {
          Authorization: `Bearer ${apiCredentials?.token}`,
        },
      }
    );

    return res.json(data);
  } catch (error) {
    console.log(error.message);
    console.log(error.response);
    return res.json({ message: 'Error' });
  }
});

router.post('/create-proposal', async (req, res) => {
  const userData = req.body;
  const state = userData.estado;
  const citie = userData.cidade;
  const citieID = cities[state].find((city) => city?.nome === citie)?.id;
  userData.citieID = citieID;

  const formatedData = normalizeData(userData);

  if (!apiCredentials?.token) await getToken(apiCredentials);

  const currentDay = new Date();
  const expiresDay = new Date(apiCredentials.expires);

  if (currentDay >= expiresDay) await getToken(apiCredentials);

  try {
    const { data } = await axios.post(
      `${process.env.CREFAZ_BASE_URL}/api/proposta`,
      formatedData,
      {
        headers: {
          Authorization: `Bearer ${apiCredentials?.token}`,
        },
      }
    );

    return res.json(data);
  } catch (error) {
    console.log(formatedData);
    console.log(error.message);
    if (error.response) {
      res.status(error.response.status);
      console.log(error?.response?.data?.errors);
      return res.json(error.response.data);
    }
    res.status(400);
    return res.json({ message: 'Error' });
  }
});

router.get('/offer/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data } = await axios.get(
      `${process.env.CREFAZ_BASE_URL}/api/proposta/oferta-produto/${id}`,
      {
        headers: {
          Authorization: `Bearer ${apiCredentials?.token}`,
        },
      }
    );

    return res.json(data);
  } catch (error) {
    console.log('error', error.message);
    if (error.response) {
      res.status(error.response.status);
      return res.json(error.response.data);
    }
    res.status(400);
    return res.json({ message: 'Error' });
  }
});

router.post('/due-date', async (req, res) => {
  const { propostaId, produtoId, tabelaJurosId } = req.body;
  const apiData = { propostaId, produtoId, tabelaJurosId };

  try {
    const { data } = await axios.post(
      `${process.env.CREFAZ_BASE_URL}/api/Proposta/calculo-vencimento`,
      apiData,
      {
        headers: {
          Authorization: `Bearer ${apiCredentials?.token}`,
        },
      }
    );

    return res.json(data);
  } catch (error) {
    console.log(error);
    if (error.response) {
      res.status(error.response.status);
      return res.json(error.response.data);
    }
    res.status(400);
    return res.json({ message: 'Error' });
  }
});

router.post('/product-offer/:id', async (req, res) => {
  const apiData = req.body;
  const { id } = req.params;

  console.log({ apiData });

  try {
    const { data } = await axios.post(
      `${process.env.CREFAZ_BASE_URL}/api/Proposta/simulacao-valor/${id}`,
      apiData,
      {
        headers: {
          Authorization: `Bearer ${apiCredentials?.token}`,
        },
      }
    );

    return res.json(data);
  } catch (error) {
    console.log(error);
    if (error.response) {
      res.status(error.response.status);
      return res.json(error.response.data);
    }
    res.status(400);
    return res.json({ message: 'Error' });
  }
});

router.post('/update-proposal', async (req, res) => {
  const apiData = req.body;
  await updateUserQueue.add(apiData, { attempts: 1, backoff: delay });
  return res.json({ ok: true });
});

router.post(
  '/image/upload',
  multer(multerConfig).array('images', 3),
  async (req, res) => {
    const { files } = req;
    const fileInfo = { files, folderName: req.body.nome };
    const today = new Intl.DateTimeFormat('pt-br', options).format(new Date());

    const valor = req.body['valor']?.replace(/\D/g, '');

    const userData = {
      nome: req.body['nome'],
      cpf: req.body['cpf'],
      whatsApp: req.body['whatsApp'],
      email: req.body['email'],
      'data-de-nascimento': req.body['data-de-nascimento'],
      'companhia-de-energia': req.body['companhia-de-energia'],
      cep: req.body['cep'],
      bairro: req.body['bairro'],
      logradouro: req.body['logradouro'],
      estado: req.body['estado'],
      cidade: req.body['cidade'],
      valor: valor,
      parcelas: req.body['parcelas'],
      renda: req.body['renda'],
      aprovado: req.body['aprovado'],
      timestamp: today,
      instalação: req.body['instalacao'],
    };

    await uploadQueue.add({ fileInfo, userData, hasImage: true });

    res.json({ ok: true });
  }
);

router.get('/proposal/search/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) {
      res.status(404);
      return res.json({ message: 'Proposal not found!' });
    }

    const data = await searchProposalByID({ proposalID: id });

    if (data.success) {
      const resData = {
        id: data?.data?.proposta?.id,
        status: data?.data.proposta?.situacaoDescricao,
        name: data?.data?.proposta?.cliente?.nome,
        motivo: data?.data?.proposta?.motivo,
      };
      return res.json(resData);
    } else {
      res.status(404);
      return res.json({ message: 'Proposal not found!' });
    }
  } catch (error) {
    console.log(error);
    res.status(500);
    return res.json({ error: 'Something went wrong' });
  }
});

router.post(
  '/mail',
  multer(multerConfig).array('images', 3),
  async (req, res) => {
    const { nome, email, cep, cidade, compahia, cpf, estado, valor, whatsApp } =
      req.body;
    const files = req.files;
    const rendaID = req.body['fonte-de-renda'];
    const renda = rendaMap[rendaID];

    sendEmailQueue.add(
      {
        nome,
        cpf,
        nascimento: req.body['data-de-nascimento'],
        email,
        whatsApp,
        estado,
        cidade,
        cep,
        renda,
        compahia,
        valor,
        files,
      },
      { attempts: 5, backoff: delay }
    );

    return res.json({ ok: true });
  }
);

router.get('/proposal/:id', async (req, res) => {
  const { id } = req.params;

  try {
    if (!id) {
      res.status(404);
      return res.json({ message: 'Proposal not found!' });
    }

    const data = await getProposalByID({ proposalID: id });

    if (data.success) {
      return res.json(data);
    } else {
      res.status(404);
      return res.json({ message: 'Proposal not found!' });
    }
  } catch (error) {
    console.log(error);
    res.status(500);
    return res.json({ error: 'Something went wrong' });
  }
});

router.get('/endereco/cidade/:id', async (req, res) => {
  const { id } = req.params;

  try {
    if (!id) {
      res.status(404);
      return res.json({ message: 'City not found!' });
    }

    const data = await getCity({ cityID: id });

    if (data.success) {
      return res.json(data);
    } else {
      res.status(404);
      return res.json({ message: 'City not found!' });
    }
  } catch (error) {
    console.log(error);
    res.status(500);
    return res.json({ error: 'Something went wrong' });
  }
});

router.post('/proposal/search-by-cpf', async (req, res) => {
  const { cpf } = req.body;

  if (!cpf) {
    res.status(404);
    return res.json({ message: 'Invalid CPF!' });
  }

  try {
    const data = await searchByCPF({ cpf });
    console.log({ data });
    if (!data.success) {
      res.status(404);
      return res.json({ message: 'Something went wrong!' });
    }

    const {
      id,
      situacaoDescricao: status,
      cliente: name,
      situacaoId,
    } = data.data.itens[0];
    return res.json({ id, status, name, situacaoId });
  } catch (error) {
    console.log(error);
    res.status(404);
    return res.json(error);
  }
});

router.post('/proposal/send-to-analise', async (req, res) => {
  const data = req.body;
  data.unidade = unidade;
  const delay = 1000 * 60 * 2;
  sendProposalToAnaliseQueue.add(data, {
    attempts: 3,
    delay: delay,
    backoff: delay,
  });
  sendProposalMailQueue.add(data, { attempts: 3, backoff: 1000 * 20 });
  return res.json({ ok: true });
});

async function contaLuzGetValues({ propostaId }) {
  try {
    const { data } = await axios.get(
      `${process.env.CREFAZ_BASE_URL}/api/proposta/oferta-produto/${propostaId}`,
      {
        headers: {
          Authorization: `Bearer ${apiCredentials?.token}`,
        },
      }
    );

    if (data.data) {
      const energyProd = data.data.produtos.find(
        (prod) => prod.nome === 'Energia'
      );
      const valueAvailable =
        energyProd.convenio[0].tabelaJuros[0].tabelaJurosValores[0];
      if (valueAvailable) return valueAvailable;
      return 0;
    }

    return 0;
  } catch (error) {
    console.log(error.message);
    return 0;
  }
}

async function searchProposalByID({ proposalID = '' }) {
  await verifyToken();

  try {
    const { data } = await axios.get(
      `${process.env.CREFAZ_BASE_URL}/api/proposta/${proposalID}`,
      {
        headers: {
          Authorization: `Bearer ${apiCredentials?.token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.log(error.message);
    return error;
  }
}

async function getProposalByID({ proposalID = '' }) {
  await verifyToken();

  try {
    const { data } = await axios.get(
      `https://api.crefazon.com.br/api/proposta/entrada-mesa-de-credito/${proposalID}`,
      {
        headers: {
          Authorization: `Bearer ${apiCredentials?.token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.log(error.message);
    return error;
  }
}

async function getCity({ cityID = '' }) {
  await verifyToken();

  try {
    const { data } = await axios.get(
      `https://api.crefazon.com.br/api/endereco/Cidade/${cityID}`,
      {
        headers: {
          Authorization: `Bearer ${apiCredentials?.token}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.log(error.message);
    return error;
  }
}

async function searchByCPF({ cpf = '' }) {
  await verifyToken();

  const searchData = {
    pagina: 1,
    filtroDinamico: cpf,
    ordenacaoAsc: false,
  };

  try {
    const { data } = await axios.post(
      `https://api.crefazon.com.br/api/proposta/acompanhamento`,
      searchData,
      {
        headers: {
          Authorization: `Bearer ${apiCredentials?.token}`,
        },
      }
    );
    return data;
  } catch (error) {
    console.log(error);
    return error;
  }
}

async function verifyToken() {
  if (!apiCredentials?.token) {
    await getToken(apiCredentials);
  }
  const currentDay = new Date();
  const expiresDay = new Date(apiCredentials.expires);
  if (currentDay >= expiresDay) await getToken(apiCredentials);
}

module.exports = router;
