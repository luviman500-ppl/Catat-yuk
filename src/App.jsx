import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  Home, PlusCircle, List, ArrowDownCircle, ArrowUpCircle, Wallet, 
  Trash2, Edit2, PieChart, Download, User, Calculator, X, ChevronRight, 
  Search, Calendar, Clock, TrendingUp, TrendingDown, Sparkles, Plus, AlertCircle,
  Delete, Check
} from 'lucide-react';

// --- FIREBASE CONFIGURATION & INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAeVO4WoFe8SyAxK2K8T_RWVDHbY0-hEkw",
  authDomain: "catat-yuk-f7daa.firebaseapp.com",
  projectId: "catat-yuk-f7daa",
  storageBucket: "catat-yuk-f7daa.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:demo"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'catat-bareng-app';

// --- DATE HELPER FUNCTIONS ---
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayDateStr = getTodayStr();
const yesterdayDateStr = getYesterdayStr();

// --- INITIAL SAMPLE DATA (DEFAULT FOR BRAND NEW FIRST TIME USER) ---
const initialSeedTransactions = [
  { id: 'seed-today-1', type: 'income', amount: 1250000, description: 'Transfer Proyek Freelance', date: todayDateStr, category: '-', addedBy: 'Papa' },
  { id: 'seed-today-2', type: 'expense', amount: 75000, description: 'Makan Siang Resto', date: todayDateStr, category: 'Makanan', addedBy: 'Papa' },
  { id: 'seed-today-3', type: 'expense', amount: 135000, description: 'Belanja Sayur & Buah', date: todayDateStr, category: 'Makanan', addedBy: 'Mama' },
  { id: 'seed-yest-1', type: 'expense', amount: 200000, description: 'Bensin Pertamax Mobil', date: yesterdayDateStr, category: 'Transportasi', addedBy: 'Papa' },
  { id: 'seed-yest-2', type: 'expense', amount: 55000, description: 'Isi Ulang Galon & Gas', date: yesterdayDateStr, category: 'Tagihan', addedBy: 'Mama' },
];

export default function App() {
  const [user, setUser] = useState(null);

  // Initialize transactions strictly from localStorage if available so deletions persist!
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('catat_bareng_db');
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Gagal membaca localStorage:", e);
    }
    return initialSeedTransactions;
  });

  const [activeTab, setActiveTab] = useState('home');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbError, setDbError] = useState(null);

  // Date Filter States
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState(currentMonth);

  // Search and Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('all');

  // Interactive Summary Selection for Papa/Mama Detail Modal
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  // Form State
  const [formType, setFormType] = useState('expense');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState(getTodayStr());
  const [formCategory, setFormCategory] = useState('Makanan');
  const [formAddedBy, setFormAddedBy] = useState('Papa');
  const [editingTransactionId, setEditingTransactionId] = useState(null);

  // Mini Calculator Modal State
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcExpression, setCalcExpression] = useState('');

  // Custom Category State
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);

  const defaultCategories = ['Makanan', 'Transportasi', 'Tagihan', 'Belanja Bulanan', 'Hiburan', 'Kesehatan', 'Lainnya'];
  
  // Save to LocalStorage whenever transactions state updates
  useEffect(() => {
    try {
      localStorage.setItem('catat_bareng_db', JSON.stringify(transactions));
    } catch (e) {
      console.error("Gagal menyimpan ke localStorage:", e);
    }
  }, [transactions]);

  // Dynamic Categories from defaults + custom items
  const categories = useMemo(() => {
    return Array.from(new Set([
      ...defaultCategories,
      ...transactions.filter(t => t.type === 'expense' && t.category && t.category !== '-').map(t => t.category)
    ]));
  }, [transactions]);

  const users = ['Papa', 'Mama'];
  const months = [
    { value: 'all', label: 'Semua Bulan (1 Tahun)' },
    { value: '01', label: 'Januari' }, { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' }, { value: '04', label: 'April' },
    { value: '05', label: 'Mei' }, { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' }, { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' }, { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' }, { value: '12', label: 'Desember' }
  ];
  
  const years = Array.from({length: 6}, (_, i) => (parseInt(currentYear) - 2 + i).toString());

  // --- 1. FIREBASE AUTHENTICATION EFFECT ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- 2. REALTIME FIRESTORE SYNCHRONIZATION EFFECT ---
  useEffect(() => {
    if (!user) return;

    const publicColRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
    const q = query(publicColRef);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          fetchedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setTransactions(fetchedData);
        }
        setDbError(null);
      }, 
      (error) => {
        console.warn("Firestore snapshot warning (menggunakan penyimpanan lokal):", error);
        setDbError("Modus Offline: Data tersimpan di HP Anda.");
      }
    );

    return () => unsubscribe();
  }, [user]);

  // --- FILTERED TRANSACTIONS FOR SELECTED PERIOD ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const matchesYear = t.date.startsWith(filterYear);
      const matchesMonth = filterMonth === 'all' ? true : t.date.substring(5, 7) === filterMonth;
      return matchesYear && matchesMonth;
    });
  }, [transactions, filterYear, filterMonth]);

  // Total Income, Expense, Balance Calculations
  const totalIncome = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  }, [filteredTransactions]);

  const totalExpense = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
  }, [filteredTransactions]);

  const balance = totalIncome - totalExpense;

  // --- TODAY'S FINANCE CALCULATIONS ---
  const todayTransactions = useMemo(() => {
    return transactions.filter(t => t.date === todayDateStr);
  }, [transactions]);

  const todayIncome = useMemo(() => {
    return todayTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  }, [todayTransactions]);

  const todayExpense = useMemo(() => {
    return todayTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
  }, [todayTransactions]);

  const todayNet = todayIncome - todayExpense;

  // Format Rupiah Helper
  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number || 0);
  };

  // Friendly Date Label Helper
  const formatDateNice = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr === todayDateStr) return 'Hari Ini';
    if (dateStr === yesterdayDateStr) return 'Kemarin';
    const [year, month, day] = dateStr.split('-');
    const d = new Date(year, parseInt(month) - 1, day);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Grouping helper for daily rekap
  const groupTransactionsByDate = (txList) => {
    const groups = {};
    txList.forEach(t => {
      const d = t.date || todayDateStr;
      if (!groups[d]) {
        groups[d] = { date: d, income: 0, expense: 0, items: [] };
      }
      groups[d].items.push(t);
      if (t.type === 'income') groups[d].income += Number(t.amount);
      if (t.type === 'expense') groups[d].expense += Number(t.amount);
    });
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // --- CALCULATOR LOGIC ---
  const handleCalcInput = (val) => setCalcExpression(prev => prev + val);
  const handleCalcClear = () => setCalcExpression('');
  const handleCalcEqual = () => {
    try {
      if (/^[0-9+\-*/. ]+$/.test(calcExpression)) {
        const sanitized = calcExpression.replace(/[^0-9+\-*/.]/g, '');
        const evalResult = Function(`'use strict'; return (${sanitized})`)();
        if (!isNaN(evalResult) && isFinite(evalResult)) {
          setCalcExpression(Math.round(evalResult).toString());
        }
      }
    } catch (e) {
      setCalcExpression('Error');
      setTimeout(() => setCalcExpression(''), 1000);
    }
  };

  const handleCalcConfirm = () => {
    try {
      let finalVal = calcExpression;
      if (/^[0-9+\-*/. ]+$/.test(calcExpression)) {
        const sanitized = calcExpression.replace(/[^0-9+\-*/.]/g, '');
        finalVal = Function(`'use strict'; return (${sanitized})`)();
      }
      if (finalVal !== 'Error' && finalVal !== '' && !isNaN(finalVal)) {
        setFormAmount(Math.round(Number(finalVal)).toString());
      }
    } catch (e) {
      // Ignore invalid input
    }
    setIsCalcOpen(false);
    setCalcExpression('');
  };

  // --- ADD / EDIT / DELETE TRANSACTIONS (PERMANENT) ---
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!formAmount || !formDesc || !formDate) return;

    const finalCategory = isCustomCategory ? customCategoryInput.trim() : formCategory;
    const actualCategory = (formType === 'expense') ? (finalCategory || 'Lainnya') : '-';

    setIsSubmitting(true);
    const newTxData = {
      type: formType,
      amount: Number(formAmount),
      description: formDesc,
      date: formDate,
      category: actualCategory,
      addedBy: formAddedBy,
      createdAt: new Date().toISOString()
    };

    try {
      if (editingTransactionId) {
        // Update local state
        const updatedList = transactions.map(t => t.id === editingTransactionId ? { ...t, ...newTxData } : t);
        setTransactions(updatedList);
        localStorage.setItem('catat_bareng_db', JSON.stringify(updatedList));

        // Update Firestore if user is authenticated and not a local seed item
        if (user && !String(editingTransactionId).startsWith('seed-')) {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'transactions', editingTransactionId);
          await updateDoc(docRef, newTxData);
        }
      } else {
        const newId = Date.now().toString();
        const createdItem = { id: newId, ...newTxData };
        
        // Save to local state immediately
        const updatedList = [createdItem, ...transactions];
        setTransactions(updatedList);
        localStorage.setItem('catat_bareng_db', JSON.stringify(updatedList));

        // Save to Firestore if connected
        if (user) {
          const publicColRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');
          await addDoc(publicColRef, { ...newTxData, userId: user.uid });
        }
      }

      resetForm();
      setActiveTab('home');
    } catch (error) {
      console.error("Error saving transaction: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    // 1. Immediately update local state and localStorage so deletion NEVER reverts on refresh
    const updatedList = transactions.filter(t => t.id !== id);
    setTransactions(updatedList);
    try {
      localStorage.setItem('catat_bareng_db', JSON.stringify(updatedList));
    } catch (e) {
      console.error("Gagal menyimpan penghapusan ke localStorage:", e);
    }

    // 2. If it's a Firestore document, remove from Firestore as well
    if (user && !String(id).startsWith('seed-')) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'transactions', id);
        await deleteDoc(docRef);
      } catch (error) {
        console.warn("Error deleting document from Firestore: ", error);
      }
    }
  };

  const handleEditClick = (t) => {
    setFormType(t.type);
    setFormAmount(t.amount.toString());
    setFormDesc(t.description);
    setFormDate(t.date);
    setFormAddedBy(t.addedBy || 'Papa');
    setFormCategory(t.category && t.category !== '-' ? t.category : 'Makanan');
    setIsCustomCategory(false);
    setEditingTransactionId(t.id);
    setActiveTab('add');
  };

  const resetForm = () => {
    setFormType('expense');
    setFormAmount('');
    setFormDesc('');
    setFormDate(getTodayStr());
    setFormCategory('Makanan');
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setEditingTransactionId(null);
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = ["Tanggal,Tipe,Kategori,Keterangan,Pencatat,Nominal (Rp)"];
    const rows = filteredTransactions.map(t =>
      `${t.date},${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'},${t.category || '-'},"${t.description.replace(/"/g, '""')}",${t.addedBy || '-'},${t.amount}`
    );
    const csvContent = "\uFEFF" + headers.concat(rows).join("\n");
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CatatBareng_${filterYear}_${filterMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- SUB-COMPONENTS & VIEWS ---

  const renderFilters = () => (
    <div className="flex gap-2 mb-4">
      <select 
        value={filterMonth} 
        onChange={(e) => setFilterMonth(e.target.value)}
        className="flex-1 bg-white border border-gray-200 text-gray-800 text-xs font-bold rounded-2xl px-3.5 py-3 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs appearance-none"
      >
        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <select 
        value={filterYear} 
        onChange={(e) => setFilterYear(e.target.value)}
        className="w-28 bg-white border border-gray-200 text-gray-800 text-xs font-bold rounded-2xl px-3.5 py-3 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs appearance-none"
      >
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );

  const renderTransactionCard = (t) => (
    <div key={t.id} className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100 flex items-center justify-between group">
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-xl ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          {t.type === 'income' ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
        </div>
        <div>
          <h4 className="font-bold text-gray-800 text-xs">{t.description}</h4>
          <div className="flex items-center text-[10px] text-gray-400 gap-1.5 mt-0.5">
            <span className={`font-bold px-1.5 py-0.2 rounded ${t.addedBy === 'Papa' ? 'bg-indigo-50 text-indigo-600' : 'bg-pink-50 text-pink-600'}`}>
              {t.addedBy || '-'}
            </span>
            {t.type === 'expense' && (
              <>
                <span>•</span>
                <span className="font-medium text-gray-500">{t.category}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className={`font-black text-xs ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
        </div>
        <div className="flex gap-0.5">
          <button onClick={() => handleEditClick(t)} className="text-gray-300 hover:text-indigo-600 p-1" title="Edit">
            <Edit2 size={13} />
          </button>
          <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-rose-600 p-1" title="Hapus">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const groupedData = groupTransactionsByDate(filteredTransactions);

    return (
      <div className="space-y-4 animate-in fade-in duration-300 pb-20">
        {renderFilters()}

        {/* 1. KEUANGAN HARI INI CARD */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 p-8 opacity-10 pointer-events-none">
            <Calendar size={130} />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-white/20 rounded-xl backdrop-blur-xs">
                  <Clock size={16} className="text-emerald-200" />
                </span>
                <div>
                  <h2 className="text-[10px] font-black uppercase tracking-wider text-emerald-100">Keuangan Hari Ini</h2>
                  <p className="text-[11px] font-semibold text-emerald-200/90">
                    {formatDateNice(todayDateStr)}
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-white/20 px-2.5 py-1 rounded-full font-bold backdrop-blur-md">
                {todayTransactions.length} transaksi
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <div className="bg-white/15 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                <div className="flex items-center gap-1 text-emerald-200 text-[10px] font-bold mb-0.5">
                  <TrendingUp size={12} /> Pemasukan Hari Ini
                </div>
                <div className="font-extrabold text-sm">{formatRupiah(todayIncome)}</div>
              </div>
              <div className="bg-white/15 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                <div className="flex items-center gap-1 text-rose-200 text-[10px] font-bold mb-0.5">
                  <TrendingDown size={12} /> Pengeluaran Hari Ini
                </div>
                <div className="font-extrabold text-sm">{formatRupiah(todayExpense)}</div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/15 text-xs">
              <span className="font-semibold text-emerald-100">Selisih Hari Ini:</span>
              <span className={`font-black text-xs px-2.5 py-0.5 rounded-lg ${todayNet >= 0 ? 'bg-emerald-400/20 text-emerald-200' : 'bg-rose-400/20 text-rose-200'}`}>
                {todayNet >= 0 ? '+' : ''}{formatRupiah(todayNet)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. OVERALL SALDO CARD */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1 opacity-90">
            <Wallet size={16} />
            <h2 className="text-[10px] font-bold uppercase tracking-wider">Total Saldo Periode Ini</h2>
          </div>
          <div className="text-2xl font-black mb-4 tracking-tight">
            {formatRupiah(balance)}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white/15 rounded-2xl p-2.5 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-1 text-emerald-300 mb-0.5">
                <ArrowDownCircle size={12} />
                <span className="text-[10px] font-semibold">Pemasukan</span>
              </div>
              <div className="font-bold text-xs truncate">{formatRupiah(totalIncome)}</div>
            </div>
            <div className="bg-white/15 rounded-2xl p-2.5 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-1 text-rose-300 mb-0.5">
                <ArrowUpCircle size={12} />
                <span className="text-[10px] font-semibold">Pengeluaran</span>
              </div>
              <div className="font-bold text-xs truncate">{formatRupiah(totalExpense)}</div>
            </div>
          </div>
        </div>

        {/* 3. PAPA VS MAMA QUICK SUMMARY BAR */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pengeluaran Papa vs Mama</span>
            <button onClick={() => setActiveTab('stats')} className="text-xs text-emerald-600 font-bold flex items-center">
              Detail <ChevronRight size={14} />
            </button>
          </div>
          {(() => {
            const pExp = filteredTransactions.filter(t => t.type === 'expense' && t.addedBy === 'Papa').reduce((a, b) => a + Number(b.amount), 0);
            const mExp = filteredTransactions.filter(t => t.type === 'expense' && t.addedBy === 'Mama').reduce((a, b) => a + Number(b.amount), 0);
            const total = pExp + mExp;
            const pPct = total > 0 ? (pExp / total) * 100 : 0;
            const mPct = total > 0 ? (mExp / total) * 100 : 0;
            return (
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-indigo-600">Papa: {formatRupiah(pExp)} ({pPct.toFixed(0)}%)</span>
                  <span className="text-pink-600">Mama: {formatRupiah(mExp)} ({mPct.toFixed(0)}%)</span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${pPct}%` }}></div>
                  <div className="bg-pink-500 h-full transition-all duration-500" style={{ width: `${mPct}%` }}></div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 4. GROUPED DAILY TRANSACTIONS */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
              <Calendar size={15} className="text-emerald-600" /> Catatan Per Hari
            </h3>
            <button onClick={() => setActiveTab('history')} className="text-xs text-emerald-600 font-bold">Lihat Semua</button>
          </div>

          {groupedData.length === 0 ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-3xl border border-gray-100 shadow-2xs">
              <p className="text-xs font-medium">Belum ada catatan pada periode ini.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {groupedData.slice(0, 5).map(group => (
                <div key={group.date} className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs">
                  {/* Daily Header */}
                  <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-xl ${group.date === todayDateStr ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                        {formatDateNice(group.date)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {group.date}
                      </span>
                    </div>

                    <div className="flex gap-2 text-[11px] font-bold">
                      {group.income > 0 && <span className="text-emerald-600">+{formatRupiah(group.income)}</span>}
                      {group.expense > 0 && <span className="text-rose-600">-{formatRupiah(group.expense)}</span>}
                    </div>
                  </div>

                  {/* Daily Items */}
                  <div className="space-y-2">
                    {group.items.map(renderTransactionCard)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStats = () => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    
    // Category Breakdown
    const categoryTotals = expenses.reduce((acc, curr) => {
      const cat = curr.category || 'Lainnya';
      acc[cat] = (acc[cat] || 0) + Number(curr.amount);
      return acc;
    }, {});
    const sortedCategories = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);

    // Papa vs Mama Breakdown
    const papaExpenses = expenses.filter(t => t.addedBy === 'Papa');
    const mamaExpenses = expenses.filter(t => t.addedBy === 'Mama');
    
    const papaTotal = papaExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const mamaTotal = mamaExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const userTotalExpense = papaTotal + mamaTotal;

    const papaPercent = userTotalExpense > 0 ? (papaTotal / userTotalExpense) * 100 : 0;
    const mamaPercent = userTotalExpense > 0 ? (mamaTotal / userTotalExpense) * 100 : 0;

    return (
      <div className="animate-in fade-in duration-300 pb-20">
        <h2 className="text-lg font-black text-gray-800 mb-3">Statistik Pengeluaran</h2>
        {renderFilters()}

        {/* CLICKABLE PAPA VS MAMA COMPARISON CARD */}
        <div className="bg-white p-4 rounded-3xl shadow-2xs border border-gray-100 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Perbandingan Pengeluaran</h3>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Klik kartu untuk detail</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {/* Papa Card Button */}
            <button 
              onClick={() => setSelectedUserDetail('Papa')}
              className="p-3 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-100 rounded-2xl text-left transition-all active:scale-95 group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                  <User size={13} /> Papa
                </span>
                <ChevronRight size={13} className="text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="font-black text-gray-900 text-sm">{formatRupiah(papaTotal)}</div>
              <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">{papaPercent.toFixed(1)}% dari total</div>
            </button>

            {/* Mama Card Button */}
            <button 
              onClick={() => setSelectedUserDetail('Mama')}
              className="p-3 bg-pink-50/80 hover:bg-pink-100 border border-pink-100 rounded-2xl text-left transition-all active:scale-95 group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-pink-700 flex items-center gap-1">
                  <User size={13} /> Mama
                </span>
                <ChevronRight size={13} className="text-pink-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="font-black text-gray-900 text-sm">{formatRupiah(mamaTotal)}</div>
              <div className="text-[10px] text-pink-600 font-semibold mt-0.5">{mamaPercent.toFixed(1)}% dari total</div>
            </button>
          </div>

          {/* Combined Visual Bar */}
          <div className="h-3 w-full flex rounded-full overflow-hidden bg-gray-100">
            <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${papaPercent}%` }}></div>
            <div className="h-full bg-pink-500 transition-all duration-700" style={{ width: `${mamaPercent}%` }}></div>
          </div>
        </div>

        {/* CATEGORY BREAKDOWN LIST */}
        <div className="bg-white p-4 rounded-3xl shadow-2xs border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rincian Per Kategori</h3>
            <span className="text-[10px] text-gray-400">Ketuk untuk rincian item</span>
          </div>

          {sortedCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">Belum ada data pengeluaran.</div>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map(cat => {
                const amount = categoryTotals[cat];
                const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                const isExpanded = expandedCategory === cat;
                const catTransactions = expenses.filter(t => (t.category || 'Lainnya') === cat);

                return (
                  <div key={cat} className="flex flex-col">
                    <div 
                      className="cursor-pointer group select-none"
                      onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                    >
                      <div className="flex justify-between items-end mb-1">
                        <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                          {cat}
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded-full font-normal">
                            {catTransactions.length}
                          </span>
                        </span>
                        <span className="font-black text-gray-900 text-xs">{formatRupiah(amount)}</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-right text-[9px] text-gray-400 mt-0.5 font-medium">{percentage.toFixed(1)}%</p>
                    </div>

                    {/* Expandable Category Detail */}
                    {isExpanded && (
                      <div className="mt-2 bg-gray-50 rounded-2xl p-3 space-y-2 border border-gray-100 animate-in fade-in">
                        {catTransactions.map(t => (
                          <div key={t.id} className="flex justify-between items-center text-xs border-b border-gray-200/50 last:border-0 pb-1.5 last:pb-0">
                            <div>
                              <span className="text-gray-800 font-bold block">{t.description}</span>
                              <span className="text-[10px] text-gray-400">
                                {formatDateNice(t.date)} • <span className="font-bold text-indigo-600">{t.addedBy}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-rose-600 text-xs">{formatRupiah(t.amount)}</span>
                              <button onClick={(e) => { e.stopPropagation(); handleEditClick(t); }} className="text-gray-400 hover:text-indigo-600 p-1">
                                <Edit2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL: INDIVIDUAL USER SUMMARY (PAPA / MAMA) */}
        {selectedUserDetail && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${selectedUserDetail === 'Papa' ? 'bg-indigo-100 text-indigo-600' : 'bg-pink-100 text-pink-600'}`}>
                    <User size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-base">Ringkasan {selectedUserDetail}</h3>
                    <p className="text-[10px] text-gray-400 font-medium">
                      Periode {filterMonth === 'all' ? filterYear : `${months.find(m=>m.value===filterMonth)?.label} ${filterYear}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedUserDetail(null)} className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {(() => {
                  const userTxs = filteredTransactions.filter(t => t.addedBy === selectedUserDetail && t.type === 'expense');
                  const userTotal = userTxs.reduce((acc, curr) => acc + Number(curr.amount), 0);

                  const userCatMap = userTxs.reduce((acc, curr) => {
                    const c = curr.category || 'Lainnya';
                    acc[c] = (acc[c] || 0) + Number(curr.amount);
                    return acc;
                  }, {});
                  const userSortedCats = Object.keys(userCatMap).sort((a, b) => userCatMap[b] - userCatMap[a]);

                  return (
                    <>
                      {/* Total Card */}
                      <div className={`p-4 rounded-2xl ${selectedUserDetail === 'Papa' ? 'bg-indigo-600 text-white' : 'bg-pink-500 text-white'}`}>
                        <span className="text-[10px] opacity-80 uppercase tracking-wider font-bold">Total Pengeluaran {selectedUserDetail}</span>
                        <div className="text-xl font-black mt-0.5">{formatRupiah(userTotal)}</div>
                        <div className="text-[10px] opacity-90 mt-1">
                          {totalExpense > 0 ? ((userTotal / totalExpense) * 100).toFixed(1) : 0}% dari total pengeluaran bersama
                        </div>
                      </div>

                      {/* Category Breakdown Specific to this User */}
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Kategori {selectedUserDetail}</h4>
                        {userSortedCats.length === 0 ? (
                          <div className="text-xs text-gray-400 py-3 text-center">Belum ada catatan pengeluaran.</div>
                        ) : (
                          <div className="space-y-2">
                            {userSortedCats.map(cat => {
                              const amt = userCatMap[cat];
                              const pct = userTotal > 0 ? (amt / userTotal) * 100 : 0;
                              return (
                                <div key={cat} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                  <div className="flex justify-between text-xs font-bold mb-1">
                                    <span className="text-gray-800">{cat}</span>
                                    <span className="text-gray-900">{formatRupiah(amt)}</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${selectedUserDetail === 'Papa' ? 'bg-indigo-500' : 'bg-pink-500'}`} 
                                      style={{ width: `${pct}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* List of Transactions Made By This User */}
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Daftar Catatan ({userTxs.length})</h4>
                        <div className="space-y-2">
                          {userTxs.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">Tidak ada riwayat.</p>
                          ) : (
                            userTxs.map(t => (
                              <div key={t.id} className="p-2.5 bg-white border border-gray-100 rounded-xl flex justify-between items-center">
                                <div>
                                  <span className="text-xs font-bold text-gray-800 block">{t.description}</span>
                                  <span className="text-[10px] text-gray-400">{formatDateNice(t.date)} • {t.category}</span>
                                </div>
                                <span className="text-xs font-black text-rose-600">{formatRupiah(t.amount)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <button 
                onClick={() => setSelectedUserDetail(null)}
                className="w-full mt-3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-2xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAddForm = () => (
    <div className="animate-in fade-in duration-300 pb-20">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-black text-gray-800">{editingTransactionId ? 'Edit Catatan' : 'Tambah Catatan Baru'}</h2>
        {editingTransactionId && (
          <button 
            type="button" 
            onClick={() => { resetForm(); setActiveTab('home'); }} 
            className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl hover:bg-rose-100"
          >
            Batal Edit
          </button>
        )}
      </div>

      <form onSubmit={handleAddTransaction} className="space-y-3.5 bg-white p-4.5 rounded-3xl shadow-2xs border border-gray-100">
        
        {/* Toggle Expense / Income */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            type="button" 
            onClick={() => setFormType('expense')} 
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${formType === 'expense' ? 'bg-white shadow-xs text-rose-600' : 'text-gray-500'}`}
          >
            Pengeluaran
          </button>
          <button 
            type="button" 
            onClick={() => setFormType('income')} 
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${formType === 'income' ? 'bg-white shadow-xs text-emerald-600' : 'text-gray-500'}`}
          >
            Pemasukan
          </button>
        </div>

        {/* Who Added? (Papa / Mama) */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Siapa yang Catat?</label>
          <div className="flex gap-2">
            {users.map(u => (
              <button 
                key={u} 
                type="button" 
                onClick={() => setFormAddedBy(u)}
                className={`flex-1 py-2.5 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${formAddedBy === u ? (u === 'Papa' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs' : 'border-pink-500 bg-pink-50 text-pink-700 shadow-2xs') : 'border-gray-200 text-gray-600'}`}
              >
                <User size={14} /> {u}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input + Calculator Trigger */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nominal (Rp)</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Rp</span>
              <input 
                type="number" 
                required 
                value={formAmount} 
                onChange={(e) => setFormAmount(e.target.value)} 
                className="w-full pl-10 pr-3 py-3 bg-gray-50 border-none rounded-2xl text-base font-extrabold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="0" 
              />
            </div>
            <button 
              type="button" 
              onClick={() => { setCalcExpression(formAmount || ''); setIsCalcOpen(true); }} 
              className="bg-emerald-100 text-emerald-700 px-3.5 rounded-2xl flex items-center justify-center hover:bg-emerald-200 transition-colors"
              title="Buka Kalkulator Hitung"
            >
              <Calculator size={20} />
            </button>
          </div>
        </div>

        {/* Category Selector */}
        {formType === 'expense' && (
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kategori</label>
            <div className="space-y-1.5">
              <select 
                value={isCustomCategory ? 'custom' : formCategory} 
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomCategory(true);
                  } else {
                    setIsCustomCategory(false);
                    setFormCategory(e.target.value);
                  }
                }} 
                className="w-full px-3.5 py-3 bg-gray-50 border-none rounded-2xl text-gray-800 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none appearance-none"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="custom" className="font-bold text-emerald-600 bg-emerald-50">➕ Tambah Kategori Baru...</option>
              </select>
              
              {isCustomCategory && (
                <input 
                  type="text" 
                  required 
                  autoFocus
                  value={customCategoryInput} 
                  onChange={(e) => setCustomCategoryInput(e.target.value)} 
                  className="w-full px-3.5 py-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold focus:ring-2 focus:ring-emerald-500 placeholder:text-emerald-300 outline-none" 
                  placeholder="Ketik Kategori Baru..." 
                />
              )}
            </div>
          </div>
        )}

        {/* Description Input */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Keterangan</label>
          <input 
            type="text" 
            required 
            value={formDesc} 
            onChange={(e) => setFormDesc(e.target.value)} 
            className="w-full px-3.5 py-3 bg-gray-50 border-none rounded-2xl text-gray-800 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
            placeholder="Contoh: Belanja Pasar, Bensin, Galon Air" 
          />
        </div>

        {/* Date Input */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tanggal</label>
          <input 
            type="date" 
            required 
            value={formDate} 
            onChange={(e) => setFormDate(e.target.value)} 
            className="w-full px-3.5 py-3 bg-gray-50 border-none rounded-2xl text-gray-800 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
          />
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold rounded-2xl shadow-md shadow-emerald-200 transition-all active:scale-98 disabled:opacity-70 mt-1 text-xs"
        >
          {isSubmitting ? 'Menyimpan...' : (editingTransactionId ? 'Update Catatan' : 'Simpan Catatan')}
        </button>
      </form>
    </div>
  );

  const renderHistory = () => {
    const historyList = filteredTransactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = historyCategoryFilter === 'all' ? true : t.category === historyCategoryFilter;
      return matchesSearch && matchesCat;
    });

    const groupedHistory = groupTransactionsByDate(historyList);

    return (
      <div className="animate-in fade-in duration-300 pb-20">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-black text-gray-800">Riwayat Catatan</h2>
          <button onClick={exportToCSV} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors">
            <Download size={14} /> CSV
          </button>
        </div>
        
        {renderFilters()}

        {/* Search & Category Filter */}
        <div className="space-y-2 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari transaksi..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <select 
            value={historyCategoryFilter} 
            onChange={(e) => setHistoryCategoryFilter(e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-700 text-xs rounded-2xl px-3 py-2 font-medium outline-none"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {groupedHistory.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-white rounded-3xl border border-gray-100 shadow-2xs">
            <p className="text-xs font-medium">Tidak ada transaksi ditemukan.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {groupedHistory.map(group => (
              <div key={group.date} className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs">
                {/* Group Daily Summary */}
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-800">{formatDateNice(group.date)}</span>
                    <span className="text-[10px] text-gray-400">{group.date}</span>
                  </div>
                  <div className="flex gap-2 text-[11px] font-bold">
                    {group.income > 0 && <span className="text-emerald-600">+{formatRupiah(group.income)}</span>}
                    {group.expense > 0 && <span className="text-rose-600">-{formatRupiah(group.expense)}</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  {group.items.map(renderTransactionCard)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex justify-center">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md h-screen flex flex-col bg-gray-50 relative overflow-hidden shadow-2xl border-x border-gray-200">
        
        {/* Top Header */}
        <header className="px-5 py-3.5 bg-white/90 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between border-b border-gray-100">
          <div>
            <h1 className="text-base font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-700">
              Catat Bareng
            </h1>
            <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">Keuangan Papa & Mama</p>
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 text-[11px] font-bold text-emerald-700">
            <Sparkles size={13} /> Realtime
          </div>
        </header>

        {/* Offline Banner if Firestore warning occurs */}
        {dbError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-[11px] text-amber-800 flex items-center gap-1.5 font-medium">
            <AlertCircle size={14} className="text-amber-600 shrink-0" />
            <span>{dbError}</span>
          </div>
        )}

        {/* Scrollable Main Body */}
        <main className="flex-1 overflow-y-auto px-4.5 pt-3.5 pb-24">
          {activeTab === 'home' && renderDashboard()}
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'add' && renderAddForm()}
          {activeTab === 'history' && renderHistory()}
        </main>

        {/* Fixed Bottom Navigation */}
        <nav className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-6 py-2.5 flex justify-between items-center rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20">
          <button 
            onClick={() => setActiveTab('home')} 
            className={`flex flex-col items-center gap-0.5 transition-colors ${activeTab === 'home' ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}
          >
            <Home size={20} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
            <span className="text-[10px]">Beranda</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('stats')} 
            className={`flex flex-col items-center gap-0.5 transition-colors ${activeTab === 'stats' ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}
          >
            <PieChart size={20} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
            <span className="text-[10px]">Statistik</span>
          </button>

          <button 
            onClick={() => { resetForm(); setActiveTab('add'); }} 
            className="-mt-8 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-3 rounded-full shadow-lg shadow-emerald-200 transform active:scale-95 border-4 border-gray-50"
            title="Tambah Catatan"
          >
            <PlusCircle size={24} />
          </button>
          
          <button 
            onClick={() => setActiveTab('history')} 
            className={`flex flex-col items-center gap-0.5 transition-colors ${activeTab === 'history' ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}
          >
            <List size={20} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
            <span className="text-[10px]">Riwayat</span>
          </button>
        </nav>

        {/* MINI CALCULATOR POPUP MODAL */}
        {isCalcOpen && (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white w-full rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                  <Calculator size={16}/> Kalkulator Hitung Cepat
                </h3>
                <button onClick={() => setIsCalcOpen(false)} className="text-gray-400 hover:text-rose-500 p-1">
                  <X size={20}/>
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-2xl p-3 mb-3 text-right overflow-x-auto border border-gray-100">
                <div className="text-xl font-black text-gray-800 tracking-wider font-mono">
                  {calcExpression || '0'}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {['7','8','9','/'].map(btn => (
                  <button key={btn} type="button" onClick={() => handleCalcInput(btn)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-base py-3 rounded-xl active:scale-95 transition-transform">{btn}</button>
                ))}
                {['4','5','6','*'].map(btn => (
                  <button key={btn} type="button" onClick={() => handleCalcInput(btn)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-base py-3 rounded-xl active:scale-95 transition-transform">{btn}</button>
                ))}
                {['1','2','3','-'].map(btn => (
                  <button key={btn} type="button" onClick={() => handleCalcInput(btn)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-base py-3 rounded-xl active:scale-95 transition-transform">{btn}</button>
                ))}
                <button type="button" onClick={handleCalcClear} className="bg-rose-100 text-rose-600 font-extrabold text-base py-3 rounded-xl active:scale-95 transition-transform">C</button>
                <button type="button" onClick={() => handleCalcInput('0')} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-base py-3 rounded-xl active:scale-95 transition-transform">0</button>
                <button type="button" onClick={handleCalcEqual} className="bg-emerald-100 text-emerald-700 font-extrabold text-base py-3 rounded-xl active:scale-95 transition-transform">=</button>
                <button type="button" onClick={() => handleCalcInput('+')} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-base py-3 rounded-xl active:scale-95 transition-transform">+</button>
              </div>

              <button 
                type="button" 
                onClick={handleCalcConfirm} 
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs rounded-2xl active:scale-95 transition-transform shadow-md shadow-emerald-200 flex items-center justify-center gap-1.5"
              >
                <Check size={16} /> Gunakan Angka Ini
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
