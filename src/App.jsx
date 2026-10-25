import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Home, 
  PlusCircle, 
  List, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Trash2, 
  PieChart, 
  User, 
  Calendar,
  Wallet,
  X
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAeVO4WoFe8SyAxK2K8T_RWVDHbY0-hEkw",
  authDomain: "catat-yuk-f7daa.firebaseapp.com",
  projectId: "catat-yuk-f7daa",
  storageBucket: "catat-yuk-f7daa.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:demo"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [type, setType] = useState('expense'); // 'income' atau 'expense'
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [user, setUser] = useState('Papa'); // 'Papa' atau 'Mama'
  const [category, setCategory] = useState('Makanan');

  const categories = ['Makanan', 'Transportasi', 'Tagihan', 'Belanja', 'Lainnya'];

  // Real-time listener ke Firestore
  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error reading Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Tambah Transaksi
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!title || !amount) return;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await addDoc(collection(db, "transactions"), {
        title,
        amount: Number(amount),
        type,
        user,
        category,
        date: todayStr,
        createdAt: serverTimestamp()
      });

      // Reset form & tutup modal
      setTitle('');
      setAmount('');
      setShowModal(false);
    } catch (error) {
      console.error("Error adding doc:", error);
      alert("Gagal menyimpan transaksi!");
    }
  };

  // Hapus Transaksi
  const handleDelete = async (id) => {
    if (window.confirm("Hapus catatan ini?")) {
      try {
        await deleteDoc(doc(db, "transactions", id));
      } catch (error) {
        console.error("Error deleting doc:", error);
      }
    }
  };

  // Kertas Kalkulasi
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(t => t.date === todayStr);

  const todayIncome = todayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const todayExpense = todayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const papaExpense = transactions
    .filter(t => t.type === 'expense' && t.user === 'Papa')
    .reduce((sum, t) => sum + t.amount, 0);

  const mamaExpense = transactions
    .filter(t => t.type === 'expense' && t.user === 'Mama')
    .reduce((sum, t) => sum + t.amount, 0);

  const papaPercent = totalExpense > 0 ? Math.round((papaExpense / totalExpense) * 100) : 0;
  const mamaPercent = totalExpense > 0 ? Math.round((mamaExpense / totalExpense) * 100) : 0;

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-24 text-slate-800 font-sans max-w-md mx-auto relative shadow-xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-b-3xl shadow-sm border-b">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Catat Bareng</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Keuangan Papa & Mama</p>
          </div>
          <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Realtime
          </span>
        </div>

        {/* Card Ringkasan Hari Ini */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-4 shadow-md mb-3">
          <div className="flex justify-between items-center text-xs opacity-90 mb-2">
            <span className="font-medium flex items-center gap-1"><Calendar size={14} /> Keuangan Hari Ini</span>
            <span>{todayTransactions.length} transaksi</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-sm">
              <p className="text-[10px] opacity-80">Pemasukan Hari Ini</p>
              <p className="text-sm font-bold">{formatRupiah(todayIncome)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-sm">
              <p className="text-[10px] opacity-80">Pengeluaran Hari Ini</p>
              <p className="text-sm font-bold">{formatRupiah(todayExpense)}</p>
            </div>
          </div>
        </div>

        {/* Card Total Saldo */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl p-4 shadow-md">
          <p className="text-xs opacity-80 mb-1 flex items-center gap-1"><Wallet size={14} /> Total Saldo Periode Ini</p>
          <h2 className="text-2xl font-bold mb-3">{formatRupiah(totalIncome - totalExpense)}</h2>
          <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/20 pt-2 opacity-90">
            <div>
              <span className="block text-[10px] opacity-75">Pemasukan</span>
              <span className="font-semibold">{formatRupiah(totalIncome)}</span>
            </div>
            <div>
              <span className="block text-[10px] opacity-75">Pengeluaran</span>
              <span className="font-semibold">{formatRupiah(totalExpense)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Papa vs Mama */}
      <div className="p-4 bg-white mt-3 rounded-2xl mx-4 shadow-sm border">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <PieChart size={14} /> Pengeluaran Papa vs Mama
        </h3>
        <div className="flex justify-between text-xs font-semibold mb-1">
          <span className="text-indigo-600">Papa: {formatRupiah(papaExpense)} ({papaPercent}%)</span>
          <span className="text-pink-600">Mama: {formatRupiah(mamaExpense)} ({mamaPercent}%)</span>
        </div>
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
          <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${papaPercent}%` }}></div>
          <div className="bg-pink-500 h-full transition-all duration-300" style={{ width: `${mamaPercent}%` }}></div>
        </div>
      </div>

      {/* List Transaksi */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1">
          <List size={16} /> Catatan Transaksi
        </h3>

        {loading ? (
          <p className="text-center text-xs text-slate-400 py-8">Memuat data dari cloud...</p>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border p-4">
            <p className="text-sm font-semibold text-slate-600">Belum ada catatan</p>
            <p className="text-xs text-slate-400 mt-1">Tekan tombol (+) di bawah untuk mulai menambah catatan keuangan bersama.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="bg-white p-3.5 rounded-2xl border flex justify-between items-center shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {t.type === 'income' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{t.title}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className={`font-semibold ${t.user === 'Papa' ? 'text-indigo-600' : 'text-pink-600'}`}>{t.user}</span>
                      <span>•</span>
                      <span>{t.category}</span>
                      <span>•</span>
                      <span>{t.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
                  </span>
                  <button 
                    onClick={() => handleDelete(t.id)}
                    className="text-slate-300 hover:text-rose-500 p-1 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-1/2 translate-x-1/2 bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition active:scale-95"
      >
        <PlusCircle size={28} />
      </button>

      {/* Modal Input Transaksi */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800">Tambah Transaksi Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-2 rounded-lg transition ${type === 'expense' ? 'bg-rose-500 text-white shadow' : 'text-slate-500'}`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 rounded-lg transition ${type === 'income' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500'}`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Input Pencatatan */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Pencatat</label>
                  <select 
                    value={user} 
                    onChange={(e) => setUser(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  >
                    <option value="Papa">Papa</option>
                    <option value="Mama">Mama</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Kategori</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Keterangan</label>
                <input 
                  type="text" 
                  placeholder="Misal: Beli Sayur, Bensin"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Jumlah (Rp)</label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                Simpan Transaksi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
