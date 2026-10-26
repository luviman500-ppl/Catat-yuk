import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
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
  Edit2, 
  PieChart, 
  Calendar,
  Wallet,
  X,
  Search,
  Download,
  Filter,
  Plus,
  Calculator,
  CalendarDays,
  Target,
  AlertTriangle,
  CheckCircle2,
  PiggyBank
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

// Kategori Bawaan Terpisah
const DEFAULT_EXPENSE_CATEGORIES = ['Makanan', 'Transportasi', 'Tagihan', 'Belanja', 'Kesehatan', 'Pendidikan', 'Hiburan', 'Lainnya'];
const DEFAULT_INCOME_CATEGORIES = ['Gaji', 'Bonus', 'Freelance', 'Investasi', 'Hadiah', 'Lainnya'];

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Navigation & Modal States
  const [activeTab, setActiveTab] = useState('beranda'); // 'beranda', 'anggaran', 'riwayat'
  const [showModal, setShowModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form States
  const [type, setType] = useState('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [user, setUser] = useState('Papa');
  const [category, setCategory] = useState('Makanan');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Budget Input State
  const [inputBudget, setInputBudget] = useState('');

  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcExpr, setCalcExpr] = useState('');

  // Categories list states
  const [expenseCategories, setExpenseCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState(DEFAULT_INCOME_CATEGORIES);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('Semua');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  // Realtime Sync Firestore - Transaksi & Budget
  useEffect(() => {
    // 1. Sync Transaksi
    const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(docs);

      const dynamicExpense = new Set(DEFAULT_EXPENSE_CATEGORIES);
      const dynamicIncome = new Set(DEFAULT_INCOME_CATEGORIES);

      docs.forEach(t => {
        if (t.category) {
          if (t.type === 'income') {
            dynamicIncome.add(t.category);
          } else {
            dynamicExpense.add(t.category);
          }
        }
      });

      setExpenseCategories(Array.from(dynamicExpense));
      setIncomeCategories(Array.from(dynamicIncome));

      setLoading(false);
    }, (error) => {
      console.error("Error reading Firestore:", error);
      setLoading(false);
    });

    // 2. Sync Anggaran Bulanan
    const unsubscribeBudget = onSnapshot(doc(db, "settings", "monthlyBudget"), (docSnap) => {
      if (docSnap.exists()) {
        const bVal = docSnap.data().amount || 0;
        setMonthlyBudget(bVal);
        setInputBudget(bVal.toString());
      } else {
        setMonthlyBudget(0);
        setInputBudget('');
      }
    });

    return () => {
      unsubscribeTransactions();
      unsubscribeBudget();
    };
  }, []);

  // Simpan Target Anggaran
  const handleSaveBudget = async (e) => {
    e.preventDefault();
    const val = Number(inputBudget);
    if (isNaN(val) || val < 0) return;

    try {
      await setDoc(doc(db, "settings", "monthlyBudget"), {
        amount: val,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setShowBudgetModal(false);
    } catch (error) {
      console.error("Error setting budget:", error);
      alert("Gagal menyimpan anggaran.");
    }
  };

  // Ubah Tipe Transaksi (Pengeluaran / Pemasukan)
  const handleTypeChange = (newType) => {
    setType(newType);
    setIsCustomCategory(false);
    setCustomCategory('');
    if (newType === 'income') {
      setCategory(incomeCategories[0] || 'Gaji');
    } else {
      setCategory(expenseCategories[0] || 'Makanan');
    }
  };

  // Logic Tombol Kalkulator
  const handleCalcButton = (btn) => {
    if (btn === 'C') {
      setCalcExpr('');
      setAmount('');
    } else if (btn === '=') {
      try {
        const sanitized = calcExpr.replace(/[^0-9+\-*/.]/g, '');
        if (sanitized) {
          const result = Function(`'use strict'; return (${sanitized})`)();
          const finalVal = Math.round(result).toString();
          setAmount(finalVal);
          setCalcExpr(finalVal);
        }
      } catch (err) {
        alert("Ekspresi matematika tidak valid.");
      }
    } else {
      const updated = calcExpr + btn;
      setCalcExpr(updated);
      if (!isNaN(updated)) {
        setAmount(updated);
      }
    }
  };

  // Modal Action Handlers
  const openAddModal = () => {
    setEditingId(null);
    setType('expense');
    setTitle('');
    setAmount('');
    setCalcExpr('');
    setShowCalculator(false);
    setUser('Papa');
    setCategory(DEFAULT_EXPENSE_CATEGORIES[0]);
    setIsCustomCategory(false);
    setCustomCategory('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const openEditModal = (t) => {
    setEditingId(t.id);
    setType(t.type);
    setTitle(t.title);
    setAmount(t.amount.toString());
    setCalcExpr(t.amount.toString());
    setShowCalculator(false);
    setUser(t.user);
    
    const activeList = t.type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
    if (activeList.includes(t.category)) {
      setCategory(t.category);
      setIsCustomCategory(false);
      setCustomCategory('');
    } else {
      setCategory('Lainnya');
      setIsCustomCategory(true);
      setCustomCategory(t.category);
    }

    setDate(t.date || new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  // Simpan Transaksi
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount) return;

    const finalCategory = isCustomCategory && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    const payload = {
      title,
      amount: Number(amount),
      type,
      user,
      category: finalCategory,
      date,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "transactions", editingId), payload);
      } else {
        await addDoc(collection(db, "transactions"), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving doc:", error);
      alert("Gagal menyimpan transaksi.");
    }
  };

  // Hapus Transaksi
  const handleDelete = async (id) => {
    if (window.confirm("Hapus catatan transaksi ini?")) {
      try {
        await deleteDoc(doc(db, "transactions", id));
      } catch (error) {
        console.error("Error deleting doc:", error);
      }
    }
  };

  // Export Data ke CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert("Tidak ada data transaksi untuk diunduh.");
      return;
    }

    const headers = ["Tanggal", "Pencatat", "Jenis", "Kategori", "Keterangan", "Jumlah (Rp)"];
    const rows = filteredTransactions.map(t => [
      t.date,
      t.user,
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      `"${t.category}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      t.amount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Keuangan_${filterMonth || 'Semua'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format Angka Rupiah
  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchUser = filterUser === 'Semua' || t.user === filterUser;
      const matchCategory = filterCategory === 'Semua' || t.category === filterCategory;
      const matchMonth = !filterMonth || (t.date && t.date.startsWith(filterMonth));
      
      return matchSearch && matchUser && matchCategory && matchMonth;
    });
  }, [transactions, searchTerm, filterUser, filterCategory, filterMonth]);

  // Kelompokkan Transaksi per Tanggal untuk Beranda
  const groupedTransactions = useMemo(() => {
    const groups = {};
    transactions.forEach(t => {
      const dateKey = t.date || 'Lainnya';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });

    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .map(dateKey => {
        const list = groups[dateKey];
        const income = list.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = list.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return {
          date: dateKey,
          items: list,
          income,
          expense
        };
      });
  }, [transactions]);

  // Kalkulasi Ringkasan & Budgeting
  const todayTransactions = transactions.filter(t => t.date === todayStr);
  const todayIncome = todayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const todayExpense = todayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const monthTransactions = transactions.filter(t => t.date && t.date.startsWith(filterMonth));
  const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const papaMonthExpense = monthTransactions.filter(t => t.type === 'expense' && t.user === 'Papa').reduce((sum, t) => sum + t.amount, 0);
  const mamaMonthExpense = monthTransactions.filter(t => t.type === 'expense' && t.user === 'Mama').reduce((sum, t) => sum + t.amount, 0);
  
  const papaPercent = monthExpense > 0 ? Math.round((papaMonthExpense / monthExpense) * 100) : 0;
  const mamaPercent = monthExpense > 0 ? Math.round((mamaMonthExpense / monthExpense) * 100) : 0;

  // Budget Calculations
  const budgetRemaining = monthlyBudget - monthExpense;
  const budgetUsagePercent = monthlyBudget > 0 ? Math.min(Math.round((monthExpense / monthlyBudget) * 100), 100) : 0;
  const isOverBudget = monthlyBudget > 0 && monthExpense > monthlyBudget;

  // Group Expenses by Category
  const categoryExpenses = useMemo(() => {
    const map = {};
    monthTransactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTransactions]);

  const allUniqueCategories = useMemo(() => {
    return Array.from(new Set([...expenseCategories, ...incomeCategories]));
  }, [expenseCategories, incomeCategories]);

  // Kalkulasi Periode Minggu, Bulan, dan Tahun
  const periodTotals = useMemo(() => {
    const now = new Date();
    
    // Rentang Minggu Ini (Senin sampai Minggu)
    const currentDay = now.getDay();
    const diffToMon = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMon));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekTransactions = transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d >= monday && d <= sunday;
    });

    const weekIncome = weekTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const weekExpense = weekTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const activeMonthStr = filterMonth || new Date().toISOString().slice(0, 7);
    const mTransactions = transactions.filter(t => t.date && t.date.startsWith(activeMonthStr));
    const mIncome = mTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const mExpense = mTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const activeYearStr = activeMonthStr.split('-')[0];
    const yTransactions = transactions.filter(t => t.date && t.date.startsWith(activeYearStr));
    const yIncome = yTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const yExpense = yTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    return {
      weekIncome,
      weekExpense,
      monthIncome: mIncome,
      monthExpense: mExpense,
      yearIncome: yIncome,
      yearExpense: yExpense,
      activeYearStr
    };
  }, [transactions, filterMonth]);

  return (
    <div className="min-h-screen bg-slate-100 pb-28 text-slate-800 font-sans max-w-md mx-auto relative shadow-2xl border-x">
      {/* Header */}
      <div className="bg-white p-5 rounded-b-3xl shadow-sm border-b">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Catat Bareng</h1>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Keuangan Papa & Mama</p>
          </div>
          <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Realtime
          </span>
        </div>

        {/* Ringkasan Hari Ini */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-4 shadow-md mb-3">
          <div className="flex justify-between items-center text-xs opacity-90 mb-2">
            <span className="font-medium flex items-center gap-1"><Calendar size={14} /> Keuangan Hari Ini</span>
            <span>{todayTransactions.length} Transaksi</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
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

        {/* Total Saldo Bulan Ini */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl p-4 shadow-md">
          <div className="flex justify-between items-center text-xs opacity-80 mb-1">
            <span className="flex items-center gap-1"><Wallet size={14} /> Saldo Periode ({filterMonth})</span>
          </div>
          <h2 className="text-2xl font-bold mb-3">{formatRupiah(monthIncome - monthExpense)}</h2>
          <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/20 pt-2 opacity-90">
            <div>
              <span className="block text-[10px] opacity-75">Total Masuk</span>
              <span className="font-semibold text-emerald-300">{formatRupiah(monthIncome)}</span>
            </div>
            <div>
              <span className="block text-[10px] opacity-75">Total Keluar</span>
              <span className="font-semibold text-rose-300">{formatRupiah(monthExpense)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'beranda' && (
        <div className="p-4 space-y-4">
          {/* Status Singkat Anggaran di Beranda */}
          {monthlyBudget > 0 && (
            <div className="bg-white p-3.5 rounded-2xl border shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${isOverBudget ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-600'}`}>
                  <Target size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Sisa Anggaran Bulan Ini</p>
                  <p className={`text-xs font-bold ${isOverBudget ? 'text-rose-600' : 'text-slate-800'}`}>
                    {isOverBudget ? `Overbudget ${formatRupiah(Math.abs(budgetRemaining))}` : formatRupiah(budgetRemaining)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('anggaran')}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-bold transition"
              >
                Detail
              </button>
            </div>
          )}

          {/* Breakdown Papa vs Mama */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <PieChart size={14} /> Pengeluaran Papa vs Mama
              </h3>
              <span className="text-[11px] text-slate-400">{filterMonth}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-indigo-600">Papa: {formatRupiah(papaMonthExpense)} ({papaPercent}%)</span>
              <span className="text-pink-600">Mama: {formatRupiah(mamaMonthExpense)} ({mamaPercent}%)</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${papaPercent}%` }}></div>
              <div className="bg-pink-500 h-full transition-all duration-300" style={{ width: `${mamaPercent}%` }}></div>
            </div>
          </div>

          {/* Transaksi Dikelompokkan Per Tanggal */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1">
                <Calendar size={16} /> Catatan Per Hari
              </h3>
              <button 
                onClick={() => setActiveTab('riwayat')} 
                className="text-xs text-teal-600 font-semibold hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            {loading ? (
              <p className="text-center text-xs text-slate-400 py-6">Memuat data...</p>
            ) : groupedTransactions.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl border p-4">
                <p className="text-sm font-semibold text-slate-600">Belum ada catatan</p>
                <p className="text-xs text-slate-400 mt-1">Tekan tombol (+) di bawah untuk mulai mencatat.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedTransactions.slice(0, 5).map((group) => (
                  <div key={group.date} className="space-y-2">
                    <div className="flex justify-between items-center bg-slate-200/60 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
                      <span className="flex items-center gap-1.5">
                        {group.date === todayStr && (
                          <span className="bg-teal-600 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">Hari Ini</span>
                        )}
                        <span>{group.date}</span>
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        {group.income > 0 && <span className="text-emerald-600 font-bold">+{formatRupiah(group.income)}</span>}
                        {group.expense > 0 && <span className="text-rose-600 font-bold">-{formatRupiah(group.expense)}</span>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {group.items.map((t) => (
                        <div key={t.id} className="bg-white p-3.5 rounded-2xl border flex justify-between items-center shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {t.type === 'income' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">{t.title}</h4>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                <span className={`font-semibold ${t.user === 'Papa' ? 'text-indigo-600' : 'text-pink-600'}`}>{t.user}</span>
                                <span>•</span>
                                <span>{t.category}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold mr-1 ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
                            </span>
                            <button onClick={() => openEditModal(t)} className="text-slate-300 hover:text-teal-600 p-1" title="Edit">
                              <Edit2 size={15} />
                            </button>
                            <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-rose-500 p-1" title="Hapus">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Anggaran (Budgeting Dashboard) */}
      {activeTab === 'anggaran' && (
        <div className="p-4 space-y-4">
          {/* Card Target & Sisa Anggaran */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Target size={14} /> Batas Anggaran Bulanan
              </h3>
              <button 
                onClick={() => setShowBudgetModal(true)}
                className="text-xs text-teal-600 font-bold hover:underline"
              >
                {monthlyBudget > 0 ? 'Ubah Target' : '+ Atur Anggaran'}
              </button>
            </div>

            {monthlyBudget === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-2xl bg-slate-50 p-4 space-y-2">
                <PiggyBank size={32} className="mx-auto text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">Belum ada batas anggaran yang diatur.</p>
                <button 
                  onClick={() => setShowBudgetModal(true)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  Atur Target Anggaran Sekarang
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Pagu</span>
                    <span className="text-sm font-bold text-slate-800">{formatRupiah(monthlyBudget)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Terpakai</span>
                    <span className="text-sm font-bold text-rose-600">{formatRupiah(monthExpense)}</span>
                  </div>
                </div>

                {/* Progress Bar Indikator */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Penggunaan Anggaran</span>
                    <span className={isOverBudget ? 'text-rose-600' : 'text-teal-600'}>
                      {budgetUsagePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverBudget 
                          ? 'bg-rose-500' 
                          : budgetUsagePercent > 80 
                          ? 'bg-amber-500' 
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${budgetUsagePercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Warning / Status Banner */}
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  isOverBudget 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                    : budgetUsagePercent > 80 
                    ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                  {isOverBudget ? (
                    <>
                      <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                      <span><strong>Overbudget!</strong> Pengeluaran melebihi anggaran sebesar {formatRupiah(Math.abs(budgetRemaining))}.</span>
                    </>
                  ) : budgetUsagePercent > 80 ? (
                    <>
                      <AlertTriangle size={18} className="shrink-0 text-amber-600" />
                      <span><strong>Waspada!</strong> Pengeluaran sudah terpakai {budgetUsagePercent}%. Sisa anggaran: {formatRupiah(budgetRemaining)}.</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                      <span><strong>Aman!</strong> Sisa anggaran bulan ini: {formatRupiah(budgetRemaining)}.</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Penggunaan Anggaran per Kategori */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pemakaian per Kategori ({filterMonth})
            </h3>

            {categoryExpenses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada pengeluaran di bulan ini.</p>
            ) : (
              categoryExpenses.map(([cat, total]) => {
                const percentOfBudget = monthlyBudget > 0 ? Math.round((total / monthlyBudget) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700">{cat}</span>
                      <span className="font-bold text-slate-800">
                        {formatRupiah(total)} {monthlyBudget > 0 && <span className="text-slate-400 font-normal">({percentOfBudget}% pagu)</span>}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(percentOfBudget, 100)}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab Riwayat & Pencarian */}
      {activeTab === 'riwayat' && (
        <div className="p-4 space-y-3">
          {/* Ringkasan Per Minggu, Bulan, dan Tahun */}
          <div className="bg-white p-3.5 rounded-2xl border shadow-sm space-y-2.5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CalendarDays size={14} /> Rekap Keuangan Periode
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-2 rounded-xl border">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Minggu Ini</span>
                <p className="text-[11px] font-bold text-emerald-600 mt-1">+{formatRupiah(periodTotals.weekIncome)}</p>
                <p className="text-[11px] font-bold text-rose-600">-{formatRupiah(periodTotals.weekExpense)}</p>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Bulan Ini</span>
                <p className="text-[11px] font-bold text-emerald-600 mt-1">+{formatRupiah(periodTotals.monthIncome)}</p>
                <p className="text-[11px] font-bold text-rose-600">-{formatRupiah(periodTotals.monthExpense)}</p>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Tahun ({periodTotals.activeYearStr})</span>
                <p className="text-[11px] font-bold text-emerald-600 mt-1">+{formatRupiah(periodTotals.yearIncome)}</p>
                <p className="text-[11px] font-bold text-rose-600">-{formatRupiah(periodTotals.yearExpense)}</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari transaksi atau kategori..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border rounded-2xl text-xs font-medium shadow-sm focus:outline-teal-500"
            />
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border shadow-sm space-y-2">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
              <Filter size={14} /> Filter Data
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <select 
                value={filterUser} 
                onChange={(e) => setFilterUser(e.target.value)}
                className="p-1.5 bg-slate-50 border rounded-xl font-medium"
              >
                <option value="Semua">Semua Orang</option>
                <option value="Papa">Papa</option>
                <option value="Mama">Mama</option>
              </select>

              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="p-1.5 bg-slate-50 border rounded-xl font-medium truncate"
              >
                <option value="Semua">Semua Kategori</option>
                {allUniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <input 
                type="month" 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="p-1.5 bg-slate-50 border rounded-xl font-medium"
              />
            </div>

            <button 
              onClick={handleExportCSV}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Download size={14} /> Unduh Laporan Excel (CSV)
            </button>
          </div>

          {/* Transaksi Filtered */}
          <div className="space-y-2 pt-1">
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">Transaksi tidak ditemukan.</p>
            ) : (
              filteredTransactions.map((t) => (
                <div key={t.id} className="bg-white p-3.5 rounded-2xl border flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {t.type === 'income' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{t.title}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span className={`font-semibold ${t.user === 'Papa' ? 'text-indigo-600' : 'text-pink-600'}`}>{t.user}</span>
                        <span>•</span>
                        <span>{t.category}</span>
                        <span>•</span>
                        <span>{t.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-bold mr-1 ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount)}
                    </span>
                    <button onClick={() => openEditModal(t)} className="text-slate-300 hover:text-teal-600 p-1">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-rose-500 p-1">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Navigasi Bawah */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t p-2 flex justify-around items-center shadow-lg z-40">
        <button 
          onClick={() => setActiveTab('beranda')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold ${activeTab === 'beranda' ? 'text-teal-600' : 'text-slate-400'}`}
        >
          <Home size={20} /> Beranda
        </button>

        <button 
          onClick={() => setActiveTab('anggaran')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold ${activeTab === 'anggaran' ? 'text-teal-600' : 'text-slate-400'}`}
        >
          <Target size={20} /> Anggaran
        </button>

        <button 
          onClick={openAddModal}
          className="bg-teal-600 hover:bg-teal-700 text-white p-3.5 rounded-full shadow-lg transition active:scale-95 -mt-6 border-4 border-slate-100"
        >
          <PlusCircle size={26} />
        </button>

        <button 
          onClick={() => setActiveTab('riwayat')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold ${activeTab === 'riwayat' ? 'text-teal-600' : 'text-slate-400'}`}
        >
          <List size={20} /> Riwayat
        </button>
      </div>

      {/* Modal Atur Anggaran */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800">Target Anggaran Bulanan</h3>
              <button onClick={() => setShowBudgetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Batas Maksimal Pengeluaran (Rp)
                </label>
                <input 
                  type="number" 
                  placeholder="Contoh: 5000000"
                  value={inputBudget}
                  onChange={(e) => setInputBudget(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowBudgetModal(false)}
                  className="w-1/2 py-2.5 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="w-1/2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  Simpan Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Input & Edit Transaksi */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800">
                {editingId ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  className={`py-2 rounded-lg transition ${type === 'expense' ? 'bg-rose-500 text-white shadow' : 'text-slate-500'}`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={`py-2 rounded-lg transition ${type === 'income' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500'}`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Input Tanggal & Pencatatan */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Tanggal</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                    required
                  />
                </div>
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
              </div>

              {/* Select & Custom Kategori */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">
                    Kategori {type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                  </label>
                  <button 
                    type="button"
                    onClick={() => setIsCustomCategory(!isCustomCategory)}
                    className="text-[11px] text-teal-600 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <Plus size={12} /> {isCustomCategory ? 'Pilih Kategori Bawaan' : 'Buat Kategori Baru'}
                  </button>
                </div>

                {isCustomCategory ? (
                  <input 
                    type="text" 
                    placeholder={`Nama kategori ${type === 'income' ? 'pemasukan' : 'pengeluaran'} baru`}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                    required
                  />
                ) : (
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  >
                    {(type === 'income' ? incomeCategories : expenseCategories).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Keterangan</label>
                <input 
                  type="text" 
                  placeholder={type === 'income' ? "Misal: Gaji Bulan Ini, Proyek Freelance" : "Misal: Beli Sayur, Bensin Mobil"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  required
                />
              </div>

              {/* Jumlah (Rp) dengan Fitur Kalkulator */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Jumlah (Rp)</label>
                  <button 
                    type="button"
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="text-[11px] text-teal-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Calculator size={13} /> {showCalculator ? 'Tutup Kalkulator' : 'Buka Kalkulator'}
                  </button>
                </div>

                <input 
                  type="number" 
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setCalcExpr(e.target.value);
                  }}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  required
                />

                {showCalculator && (
                  <div className="mt-2.5 p-2.5 bg-slate-100 rounded-2xl border text-xs shadow-inner space-y-2">
                    <div className="bg-white p-2 rounded-xl text-right font-mono text-xs text-slate-600 border truncate min-h-[32px]">
                      {calcExpr || '0'}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'].map((btn) => (
                        <button
                          key={btn}
                          type="button"
                          onClick={() => handleCalcButton(btn)}
                          className={`p-2.5 rounded-xl font-bold transition active:scale-95 ${
                            ['/','*','-','+','='].includes(btn) 
                              ? 'bg-teal-600 text-white' 
                              : btn === 'C' 
                              ? 'bg-rose-500 text-white' 
                              : 'bg-white text-slate-700 hover:bg-slate-200 border'
                          }`}
                        >
                          {btn}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                {editingId ? 'Simpan Perubahan' : 'Tambah Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
