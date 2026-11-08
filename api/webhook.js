export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { message, sender } = req.body;

  if (!message) {
    return res.status(200).json({ status: false, response: 'Pesan kosong.' });
  }

  try {
    const text = message.trim();
    const words = text.split(' ');

    const amountMatch = text.replace(/\./g, '').match(/\b\d+\b/);
    if (!amountMatch) {
      return res.status(200).json({ 
        status: true, 
        response: 'Format chat tidak dikenali. Contoh: Makan 25000 Papa' 
      });
    }
    const amount = parseInt(amountMatch[0], 10);

    const isIncome = /pemasukan|masuk|gaji|bonus|freelance|hadiah/i.test(text);
    const type = isIncome ? 'income' : 'expense';

    const isMama = /mama|istri/i.test(text);
    const user = isMama ? 'Mama' : 'Papa';

    const cleanTitle = words
      .filter(w => !/\d+/.test(w) && !/pemasukan|masuk|pengeluaran|keluar|mama|papa/i.test(w))
      .join(' ') || (isIncome ? 'Pemasukan WA' : 'Pengeluaran WA');

    let category = isIncome ? 'Gaji' : 'Makanan';
    const lowerTitle = cleanTitle.toLowerCase();

    if (type === 'expense') {
      if (/makan|sayur|kopi|beras|nasi|snack|jajanan/i.test(lowerTitle)) category = 'Makanan';
      else if (/bensin|tol|parkir|gojek|grab|servis|ban/i.test(lowerTitle)) category = 'Transportasi';
      else if (/listrik|wifi|air|pdam|pulsa|kuota|spp|tagihan/i.test(lowerTitle)) category = 'Tagihan';
      else if (/obat|dokter|apotek|vitamin/i.test(lowerTitle)) category = 'Kesehatan';
      else category = 'Belanja';
    } else {
      if (/bonus/i.test(lowerTitle)) category = 'Bonus';
      else if (/freelance|proyek|project/i.test(lowerTitle)) category = 'Freelance';
      else if (/hadiah|tunjangan/i.test(lowerTitle)) category = 'Hadiah';
      else category = 'Gaji';
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const firestoreUrl = 'https://firestore.googleapis.com/v1/projects/catat-yuk-f7daa/databases/(default)/documents/transactions';

    const firestorePayload = {
      fields: {
        title: { stringValue: cleanTitle },
        amount: { integerValue: amount.toString() },
        type: { stringValue: type },
        user: { stringValue: user },
        category: { stringValue: category },
        paymentMethod: { stringValue: 'Tunai' },
        date: { stringValue: todayStr },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    };

    const firebaseRes = await fetch(firestoreUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestorePayload)
    });

    if (!firebaseRes.ok) {
      throw new Error('Gagal menyimpan ke Firestore');
    }

    const replyText = `✅ *Berhasil Dicatat di Catat Bareng!*\n\n` +
      `📝 *Keterangan:* ${cleanTitle}\n` +
      `💰 *Jumlah:* Rp ${amount.toLocaleString('id-ID')}\n` +
      `📁 *Kategori:* ${category}\n` +
      `👤 *Pencatat:* ${user}\n` +
      `📅 *Tanggal:* ${todayStr}`;

    return res.status(200).json({ status: true, response: replyText });

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(200).json({ status: false, response: 'Terjadi kesalahan sistem saat menyimpan data.' });
  }
}
