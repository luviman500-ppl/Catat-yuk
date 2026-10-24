import React, { useState, useEffect } from 'react';

export default function App() {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('catat_bareng_db');
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'Belanja Bulanan', amount: 350000, type: 'expense', category: 'Belanja', user: 'Mama', date: '2026-10-24' },
      { id: 2, title: 'Gaji Bulanan', amount: 5000000, type: 'income', category: 'Gaji', user: 'Papa', date: '2026-10-24' }
    ];
  });

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Belanja');
  const [user, setUser] = useState('Papa');

  useEffect(() => {
    localStorage.setItem('catat_bareng_db', JSON.stringify(transactions));
  }, [transactions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !amount) return;

    const newTransaction = {
      id: Date.now(),
      title,
      amount: parseFloat(amount),
      type,
      category,
      user,
      date: new Date().toISOString().split('T')[0]
    };

    setTransactions([newTransaction, ...transactions]);
    setTitle('');
    setAmount('');
  };

  const handleDelete = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalIncome - totalExpense;

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-12">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Catat Bareng</h1>
            <p className="text-xs text-emerald-100">Catatan Keuangan Papa & Mama</p>
          </div>
          <span className="bg-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium">
            Online
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Ringkasan Saldo */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500 font-medium">Total Saldo</p>
          <p className={`text-2xl font-bold mt-1 ${balance < 0 ? 'text-red-500' : 'text-slate-800'}`}>
            {formatRupiah(balance)}
          </p>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
              <p className="text-[11px] text-emerald-700 font-medium">Pemasukan</p>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">{formatRupiah(totalIncome)}</p>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
              <p className="text-[11px] text-rose-700 font-medium">Pengeluaran</p>
              <p className="text-sm font-bold text-rose-600 mt-0.5">{formatRupiah(totalExpense)}</p>
            </div>
          </div>
        </div>

        {/* Form Tambah Transaksi */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          <h2 className="text-sm font-bold text-slate-700">Tambah Catatan Baru</h2>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                type === 'expense' 
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm' 
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                type === 'income' 
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' 
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Pemasukan
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500 font-medium block mb-1">Pencatat</label>
              <select 
                value={user} 
                onChange={(e) => setUser(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Papa">Papa</option>
                <option value="Mama">Mama</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-medium block mb-1">Kategori</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Belanja">Belanja</option>
                <option value="Makanan">Makanan</option>
                <option value="Tagihan">Tagihan</option>
                <option value="Transportasi">Transportasi</option>
                <option value="Gaji">Gaji</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder="Keterangan (misal: Beli Popok)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <input
              type="number"
              placeholder="Jumlah (Rp)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors shadow-sm"
          >
            Simpan Catatan
          </button>
        </form>

        {/* Riwayat Transaksi */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
          <h2 className="text-sm font-bold text-slate-700">Riwayat Catatan</h2>
          
          {transactions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Belum ada catatan transaksi.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      t.user === 'Papa' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                    }`}>
                      {t.user === 'Papa' ? 'P' : 'M'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{t.title}</p>
                      <p className="text-[10px] text-slate-400">{t.category} • {t.user} • {t.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
                    </span>
                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="text-slate-300 hover:text-rose-500 text-xs p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
