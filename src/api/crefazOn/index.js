const express = require('express');
const router = express.Router();

const {
  login: crefazLogin,
  getProposalById,
  updateProposal,
  initiateCrive,
  getOffers,
  createProposal
} = require('../../functions/creafazOn');

router.post('/login', async (req, res) => {
  const { login, senha } = req.body;

  if (!login || !senha)
    return res.status(400).json({ message: 'login and senha is required' });

  try {
    const data = await crefazLogin({ login, senha });
    return res.json({ data });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: 'invalid data!' });
  }
});

router.get('/offers/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const data = await getOffers({ proposalId: id });
    res.json({ data });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: 'Invalid request' });
  }
});

router.post('/proposal', async (req, res) => {
  try {
    const data = await createProposal({ proposalData: req.body });
    res.json({ data });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: 'Invalid request' });
  }
})

router.get('/proposal/:id', async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ message: 'Invalid proposal ID' });

  try {
    const data = await getProposalById({ proposalId: id });
    res.json({ data });
  } catch (error) {
    res.status(400).json({ message: 'Invalid request' });
  }
});

router.put('/proposal/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const data = await updateProposal({ proposalId: id, proposalData: req.body });
    res.json({ data });
  } catch (error) {
    res.status(400).json({ message: 'Invalid request' });
  }
});

router.post('/proposal/crive', async (req, res) => {
  try {
    const data = await initiateCrive({ criveData: req.body });
    res.json({ data });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: 'Invalid request' });
  }
});

module.exports = router;
