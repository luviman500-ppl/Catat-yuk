import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Trash2, 
  User, 
  PieChart, 
  X, 
  Delete, 
  Check, 
  ShoppingBag, 
  Utensils, 
  Receipt, 
  Car, 
  DollarSign, 
  Film, 
  MoreHorizontal,
  Filter
} from 'lucide-react';

export default function App() {
  // 1. Storage & State Management
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('catat_bareng_db');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Gagal memuat data dari localStorage:", e);
    }
    return [
      { id: 1, title: 'Gaji Bulanan', amount: 8000000, type: 'income', category: 'Gaji', user: 'Papa', date: '2026-10-24' },
      { id: 2, title: 'Belanja Mingguan', amount: 450000, type: 'expense', category: 'Belanja', user: 'Mama', date: '2026-10-24' },
      { id: 3, title: 'Bensin & Tol', amount: 150000, type: 'expense', category: 'Transportasi', user: 'Papa', date: '2026-10-24' },
      { id: 4, title: 'Listrik & Air', amount: 350000, type: 'expense', category: 'Tagihan', user: 'Mama', date: '2026-10-24' }
    ];
  });

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Belanja');
  const [user, setUser] = useState('Papa');

  // Filter State
  const [filterUser, setFilterUser] = useState('Semua');

  // Calculator Modal State
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('');

  // Persist Data to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('catat_bareng_db', JSON.stringify(transactions));
    } catch (e) {
      console.error("Gagal menyimpan ke localStorage:", e);
    }
  }, [transactions]);

  // Handle Submit Form
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || parseFloat(amount) <= 0) return;

    const newTransaction = {
      id: Date.now(),
      title: title.trim(),
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

  // Handle Delete Item
  const handleDelete = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  // Calculations
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalBalance = totalIncome - totalExpense;

  // Papa vs Mama Calculations
  const papaIncome = transactions
    .filter(t => t.user === 'Papa' && t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const papaExpense = transactions
    .filter(t => t.user === 'Papa' && t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const papaBalance = papaIncome - papaExpense;

  const mamaIncome = transactions
    .filter(t => t.user === 'Mama' && t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const mamaExpense = transactions
    .filter(t => t.user === 'Mama' && t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const mamaBalance = mamaIncome - mamaExpense;

  const papaPercent = totalExpense > 0 ? Math.round((papaExpense / totalExpense) * 100) : 0;
  const mamaPercent = totalExpense > 0 ? Math.round((mamaExpense / totalExpense) * 100) : 0;

  // Filtered List
  const filteredTransactions = transactions.filter(t => {
    if (filterUser === 'Papa') return t.user === 'Papa';
    if (filterUser === 'Mama') return t.user === 'Mama';
    return true;
  });

  // Rupiah Formatter
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Category Icon Resolver
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Belanja': return <ShoppingBag className="w-4 h-4 text-purple-500" />;
      case 'Makanan': return <Utensils className="w-4 h-4 text-orange-500" />;
      case 'Tagihan': return <Receipt className="w-4 h-4 text-red-500" />;
      case 'Transportasi': return <Car className="w-4 h-4 text-blue-500" />;
      case 'Gaji': return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'Hiburan': return <Film className="w-4 h-4 text-pink-500" />;
      default: return <MoreHorizontal className="w-4 h-4 text-slate-500" />;
    }
  };

  // Calculator Logic
  const handleCalcBtnClick = (val) => {
    if (val === 'C') {
      setCalcDisplay('');
    } else if (val === 'DEL') {
      setCalcDisplay(prev => prev.slice(0, -1));
    } else if (val === '=') {
      try {
        const sanitized = calcDisplay.replace(/×/g, '*').replace(/÷/g, '/');
        const res = Function(`'use strict'; return (${sanitized})`)();
        if (!isNaN(res) && isFinite(res)) {
          setCalcDisplay(String(Math.round(res)));
        }
      } catch (err) {
        // Abaikan ekspresi eror
      }
    } else {
      setCalcDisplay(prev => prev + val);
    }
  };

  const applyCalcToForm = () => {
    try {
      const sanitized = calcDisplay.replace(/×/g, '*').replace(/÷/g, '/');
      const res = Function(`'use strict'; return (${sanitized})`)();
      if (!isNaN(res) && isFinite(res)) {
        setAmount(String(Math.round(res)));
      } else if (calcDisplay && !isNaN(calcDisplay)) {
        setAmount(calcDisplay);
      }
    } catch (e) {
      if (calcDisplay && !isNaN(calcDisplay)) {
        setAmount(calcDisplay);
      }
    }
    setIsCalcOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Header Utama */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 shadow-lg sticky top-0 z-20">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
              <Wallet className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Catat Bareng</h1>
              <p className="text-xs text-emerald-100/90 font-medium">Papa & Mama Financial</p>
            </div>
          </div>
          <button
            onClick={() => setIsCalcOpen(true)}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-xl backdrop-blur-md transition-all active:scale-95 font-medium border border-white/20"
          >
            <Calculator className="w-4 h-4" />
            <span>Kalkulator</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* 1. Ringkasan Saldo Gabungan */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
            <span>Saldo Gabungan Saat Ini</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Real-time</span>
          </div>
          <p className={`text-3xl font-extrabold tracking-tight ${totalBalance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {formatRupiah(totalBalance)}
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100/80">
              <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-[11px] font-semibold">Total Pemasukan</span>
              </div>
              <p className="text-sm font-bold text-emerald-600">{formatRupiah(totalIncome)}</p>
            </div>
            <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-100/80">
              <div className="flex items-center gap-1.5 text-rose-700 mb-1">
                <ArrowDownRight className="w-4 h-4" />
                <span className="text-[11px] font-semibold">Total Pengeluaran</span>
              </div>
              <p className="text-sm font-bold text-rose-600">{formatRupiah(totalExpense)}</p>
            </div>
          </div>
        </section>

        {/* 2. Breakdown Pengeluaran Papa vs Mama */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pengeluaran Papa vs Mama</h2>
            </div>
            <span className="text-[10px] text-slate-400">Bulan Ini</span>
          </div>

          {/* Visual Bar Comparison */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                style={{ width: `${papaPercent}%` }} 
                className="bg-blue-500 h-full transition-all duration-500" 
              />
              <div 
                style={{ width: `${mamaPercent}%` }} 
                className="bg-pink-500 h-full transition-all duration-500" 
              />
            </div>
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-blue-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                Papa {papaPercent}%
              </span>
              <span className="text-pink-600 flex items-center gap-1">
                Mama {mamaPercent}%
                <span className="w-2 h-2 rounded-full bg-pink-500 inline-block"></span>
              </span>
            </div>
          </div>

          {/* Stats Detail Cards */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">P</span>
                  Papa
                </span>
                <span className="text-[10px] text-slate-500">Saldo: {formatRupiah(papaBalance)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Pengeluaran:</p>
              <p className="text-sm font-bold text-blue-700">{formatRupiah(papaExpense)}</p>
            </div>

            <div className="p-3 rounded-xl bg-pink-50/50 border border-pink-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-pink-700 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-[10px] flex items-center justify-center font-bold">M</span>
                  Mama
                </span>
                <span className="text-[10px] text-slate-500">Saldo: {formatRupiah(mamaBalance)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Pengeluaran:</p>
              <p className="text-sm font-bold text-pink-700">{formatRupiah(mamaExpense)}</p>
            </div>
          </div>
        </section>

        {/* 3. Form Input Transaksi Baru */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-600" />
            Tambah Catatan Transaksi
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Toggle Pengeluaran / Pemasukan */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pengeluaran (-)
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pemasukan (+)
              </button>
            </div>

            {/* Pencatat & Kategori */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Pencatat</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setUser('Papa')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      user === 'Papa' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Papa
                  </button>
                  <button
                    type="button"
                    onClick={() => setUser('Mama')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      user === 'Mama' ? 'bg-pink-500 text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Mama
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-100 border-none text-xs font-semibold rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Belanja">🛒 Belanja</option>
                  <option value="Makanan">🍲 Makanan</option>
                  <option value="Tagihan">📄 Tagihan</option>
                  <option value="Transportasi">🚗 Transportasi</option>
                  <option value="Gaji">💰 Gaji</option>
                  <option value="Hiburan">🎬 Hiburan</option>
                  <option value="Lainnya">📦 Lainnya</option>
                </select>
              </div>
            </div>

            {/* Input Description */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Keterangan Transaksi</label>
              <input
                type="text"
                placeholder="Contoh: Belanja Bulanan Supermarket"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-100 border-none text-xs font-medium rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>

            {/* Input Amount with Calculator Trigger */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Nominal Rp</label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-100 border-none text-xs font-bold rounded-xl p-2.5 pr-24 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsCalcOpen(true)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
                >
                  <Calculator className="w-3 h-3" />
                  Kalkulator
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-md shadow-emerald-600/20 active:scale-[0.99]"
            >
              Simpan Catatan Keuangan
            </button>
          </form>
        </section>

        {/* 4. Filter & Riwayat Transaksi */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-emerald-600" />
              Riwayat Catatan
            </h2>

            {/* Tab Filter Papa/Mama */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto">
              {['Semua', 'Papa', 'Mama'].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilterUser(item)}
                  className={`flex-1 sm:flex-none px-3 py-1 rounded-lg transition-all ${
                    filterUser === item
                      ? 'bg-white text-emerald-700 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-xs">Belum ada catatan transaksi pada filter ini.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((t) => (
                <div 
                  key={t.id} 
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 transition-all rounded-xl border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    {/* Badge User 'P' or 'M' */}
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                      t.user === 'Papa' ? 'bg-blue-600 text-white' : 'bg-pink-500 text-white'
                    }`}>
                      {t.user === 'Papa' ? 'P' : 'M'}
                    </span>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-800">{t.title}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {getCategoryIcon(t.category)}
                          {t.category}
                        </span>
                        <span className="text-[10px] text-slate-400">{t.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-extrabold ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
                    </span>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 5. Modal Kalkulator Interaktif */}
      {isCalcOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl">
            {/* Header Modal */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">Kalkulator Keuangan</h3>
              </div>
              <button 
                onClick={() => setIsCalcOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Display Kalkulator */}
            <div className="bg-slate-900 text-white rounded-xl p-4 text-right space-y-1 shadow-inner">
              <p className="text-xs text-slate-400 min-h-[16px] tracking-wider font-mono">
                {calcDisplay || '0'}
              </p>
              <p className="text-2xl font-bold tracking-tight text-emerald-400 font-mono">
                {calcDisplay ? calcDisplay : '0'}
              </p>
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-4 gap-2">
              {['C', '÷', '×', 'DEL'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleCalcBtnClick(btn === 'DEL' ? 'DEL' : btn)}
                  className="py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs active:scale-95 transition-all"
                >
                  {btn === 'DEL' ? <Delete className="w-4 h-4 mx-auto" /> : btn}
                </button>
              ))}

              {['7', '8', '9', '-'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleCalcBtnClick(btn)}
                  className={`py-3 font-bold rounded-xl text-xs active:scale-95 transition-all ${
                    btn === '-' 
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  {btn}
                </button>
              ))}

              {['4', '5', '6', '+'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleCalcBtnClick(btn)}
                  className={`py-3 font-bold rounded-xl text-xs active:scale-95 transition-all ${
                    btn === '+' 
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  {btn}
                </button>
              ))}

              {['1', '2', '3', '='].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleCalcBtnClick(btn)}
                  className={`py-3 font-bold rounded-xl text-xs active:scale-95 transition-all ${
                    btn === '=' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white row-span-2 flex items-center justify-center' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  {btn}
                </button>
              ))}

              {['0', '.'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleCalcBtnClick(btn)}
                  className={`py-3 font-bold rounded-xl text-xs active:scale-95 transition-all bg-slate-100 hover:bg-slate-200 text-slate-800 ${
                    btn === '0' ? 'col-span-2' : ''
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>

            {/* Button Pakai Hasil */}
            <button
              type="button"
              onClick={applyCalcToForm}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all"
            >
              <Check className="w-4 h-4" />
              Pakai Hasil di Form Transaksi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
