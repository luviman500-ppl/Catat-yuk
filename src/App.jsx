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
  deleteField,
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
  PiggyBank,
  BarChart3,
  HandCoins,
  Trophy,
  Check,
  Coins
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

const DEFAULT_EXPENSE_CATEGORIES = ['Makanan', 'Transportasi', 'Tagihan', 'Belanja', 'Kesehatan', 'Pendidikan', 'Hiburan', 'Lainnya'];
const DEFAULT_INCOME_CATEGORIES = ['Gaji', 'Bonus', 'Freelance', 'Investasi', 'Hadiah', 'Lainnya'];

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [debts, setDebts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation States
  const [activeTab, setActiveTab] = useState('beranda'); // 'beranda', 'anggaran', 'fitur_lain', 'statistik', 'riwayat'
  const [subTabFitur, setSubTabFitur] = useState('utang'); // 'utang', 'goals'

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAddGoalFundModal, setShowAddGoalFundModal] = useState(false);

  // Form States Transaksi
  const [editingId, setEditingId] = useState(null);
  const [type, setType] = useState('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [user, setUser] = useState('Papa');
  const [category, setCategory] = useState('Makanan');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Form States Modal Anggaran
  const [budgetCatName, setBudgetCatName] = useState('');
  const [isNewBudgetCatCustom, setIsNewBudgetCatCustom] = useState(false);
  const [customBudgetCatName, setCustomBudgetCatName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isEditingBudget, setIsEditingBudget] = useState(false);

  // Form States Utang & Piutang
  const [editingDebtId, setEditingDebtId] = useState(null);
  const [debtType, setDebtType] = useState('utang'); // 'utang' atau 'piutang'
  const [debtPerson, setDebtPerson] = useState('');
  const [debtTitle, setDebtTitle] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');

  // Form States Goals / Impian
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalCurrentAmount, setGoalCurrentAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  
  // Fund Addition State
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [addFundAmount, setAddFundAmount] = useState('');

  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcExpr, setCalcExpr] = useState('');

  // Categories list
  const [expenseCategories, setExpenseCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState(DEFAULT_INCOME_CATEGORIES);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('Semua');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  // Realtime Sync Firestore
  useEffect(() => {
    // 1. Transaksi
    const qTrans = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(docs);

      const dynamicExpense = new Set(DEFAULT_EXPENSE_CATEGORIES);
      const dynamicIncome = new Set(DEFAULT_INCOME_CATEGORIES);
      docs.forEach(t => {
        if (t.category) {
          if (t.type === 'income') dynamicIncome.add(t.category);
          else dynamicExpense.add(t.category);
        }
      });
      setExpenseCategories(Array.from(dynamicExpense));
      setIncomeCategories(Array.from(dynamicIncome));
      setLoading(false);
    });

    // 2. Anggaran Per Kategori
    const unsubBudgets = onSnapshot(doc(db, "settings", "categoryBudgets"), (docSnap) => {
      setCategoryBudgets(docSnap.exists() ? docSnap.data() || {} : {});
    });

    // 3. Utang & Piutang
    const qDebts = query(collection(db, "debts"), orderBy("createdAt", "desc"));
    const unsubDebts = onSnapshot(qDebts, (snapshot) => {
      setDebts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 4. Goals / Impian
    const qGoals = query(collection(db, "goals"), orderBy("createdAt", "desc"));
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      setGoals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubTrans();
      unsubBudgets();
      unsubDebts();
      unsubGoals();
    };
  }, []);

  // --- ACTIONS: UTANG & PIUTANG ---
  const openAddDebtModal = () => {
    setEditingDebtId(null);
    setDebtType('utang');
    setDebtPerson('');
    setDebtTitle('');
    setDebtAmount('');
    setDebtDueDate('');
    setShowDebtModal(true);
  };

  const openEditDebtModal = (d) => {
    setEditingDebtId(d.id);
    setDebtType(d.type);
    setDebtPerson(d.person);
    setDebtTitle(d.title);
    setDebtAmount(d.amount.toString());
    setDebtDueDate(d.dueDate || '');
    setShowDebtModal(true);
  };

  const handleSaveDebt = async (e) => {
    e.preventDefault();
    if (!debtPerson || !debtAmount) return;

    const payload = {
      type: debtType,
      person: debtPerson,
      title: debtTitle || (debtType === 'utang' ? `Utang ke ${debtPerson}` : `Piutang pada ${debtPerson}`),
      amount: Number(debtAmount),
      dueDate: debtDueDate,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingDebtId) {
        await updateDoc(doc(db, "debts", editingDebtId), payload);
      } else {
        await addDoc(collection(db, "debts"), {
          ...payload,
          isPaid: false,
          createdAt: serverTimestamp()
        });
      }
      setShowDebtModal(false);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan catatan utang/piutang.");
    }
  };

  const toggleDebtPaid = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, "debts", id), { isPaid: !currentStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDebt = async (id) => {
    if (window.confirm("Hapus catatan ini?")) {
      try { await deleteDoc(doc(db, "debts", id)); } catch (err) { console.error(err); }
    }
  };

  // --- ACTIONS: GOALS / TARGET IMPIAN ---
  const openAddGoalModal = () => {
    setEditingGoalId(null);
    setGoalTitle('');
    setGoalTargetAmount('');
    setGoalCurrentAmount('0');
    setGoalTargetDate('');
    setShowGoalModal(true);
  };

  const openEditGoalModal = (g) => {
    setEditingGoalId(g.id);
    setGoalTitle(g.title);
    setGoalTargetAmount(g.targetAmount.toString());
    setGoalCurrentAmount(g.currentAmount.toString());
    setGoalTargetDate(g.targetDate || '');
    setShowGoalModal(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!goalTitle || !goalTargetAmount) return;

    const payload = {
      title: goalTitle,
      targetAmount: Number(goalTargetAmount),
      currentAmount: Number(goalCurrentAmount) || 0,
      targetDate: goalTargetDate,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingGoalId) {
        await updateDoc(doc(db, "goals", editingGoalId), payload);
      } else {
        await addDoc(collection(db, "goals"), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      setShowGoalModal(false);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan target impian.");
    }
  };

  const handleAddGoalFund = async (e) => {
    e.preventDefault();
    if (!selectedGoal || !addFundAmount) return;

    const newAmount = (selectedGoal.currentAmount || 0) + Number(addFundAmount);
    try {
      await updateDoc(doc(db, "goals", selectedGoal.id), {
        currentAmount: newAmount,
        updatedAt: serverTimestamp()
      });
      setShowAddGoalFundModal(false);
      setAddFundAmount('');
    } catch (err) {
      console.error(err);
      alert("Gagal menambah saldo impian.");
    }
  };

  const handleDeleteGoal = async (id) => {
    if (window.confirm("Hapus target impian ini?")) {
      try { await deleteDoc(doc(db, "goals", id)); } catch (err) { console.error(err); }
    }
  };

  // --- ACTIONS: ANGGARAN KATEGORI ---
  const openAddBudgetModal = () => {
    setIsEditingBudget(false);
    setBudgetCatName(expenseCategories[0] || 'Makanan');
    setIsNewBudgetCatCustom(false);
    setCustomBudgetCatName('');
    setBudgetAmount('');
    setShowBudgetModal(true);
  };

  const openEditBudgetModal = (catName, currentAmount) => {
    setIsEditingBudget(true);
    setBudgetCatName(catName);
    setIsNewBudgetCatCustom(false);
    setCustomBudgetCatName('');
    setBudgetAmount(currentAmount.toString());
    setShowBudgetModal(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    const finalCatName = isNewBudgetCatCustom && customBudgetCatName.trim()
      ? customBudgetCatName.trim()
      : budgetCatName;

    const val = Number(budgetAmount);
    if (!finalCatName || isNaN(val) || val <= 0) {
      alert("Masukkan nama kategori dan nominal anggaran yang valid.");
      return;
    }

    try {
      await setDoc(doc(db, "settings", "categoryBudgets"), {
        [finalCatName]: val
      }, { merge: true });
      setShowBudgetModal(false);
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan anggaran.");
    }
  };

  const handleDeleteBudget = async (catName) => {
    if (window.confirm(`Hapus anggaran untuk kategori "${catName}"?`)) {
      try {
        await updateDoc(doc(db, "settings", "categoryBudgets"), {
          [catName]: deleteField()
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  // --- TRANSAKSI STANDARD ---
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
      console.error(error);
      alert("Gagal menyimpan transaksi.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Hapus catatan transaksi ini?")) {
      try {
        await deleteDoc(doc(db, "transactions", id));
      } catch (error) {
        console.error(error);
      }
    }
  };

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
        return { date: dateKey, items: list, income, expense };
      });
  }, [transactions]);

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

  const categoryExpensesMap = useMemo(() => {
    const map = {};
    monthTransactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return map;
  }, [monthTransactions]);

  const categoryExpenses = useMemo(() => Object.entries(categoryExpensesMap).sort((a, b) => b[1] - a[1]), [categoryExpensesMap]);

  const categoryIncomes = useMemo(() => {
    const map = {};
    monthTransactions.filter(t => t.type === 'income').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTransactions]);

  const totalCategoryBudget = useMemo(() => Object.values(categoryBudgets).reduce((sum, val) => sum + (Number(val) || 0), 0), [categoryBudgets]);
  const budgetRemaining = totalCategoryBudget - monthExpense;
  const isOverBudget = totalCategoryBudget > 0 && monthExpense > totalCategoryBudget;
  const budgetCategoryList = useMemo(() => Object.entries(categoryBudgets), [categoryBudgets]);
  const allUniqueCategories = useMemo(() => Array.from(new Set([...expenseCategories, ...incomeCategories])), [expenseCategories, incomeCategories]);

  // Kalkulasi Ringkasan Utang & Piutang
  const totalUtangUnpaid = useMemo(() => debts.filter(d => d.type === 'utang' && !d.isPaid).reduce((s, d) => s + d.amount, 0), [debts]);
  const totalPiutangUnpaid = useMemo(() => debts.filter(d => d.type === 'piutang' && !d.isPaid).reduce((s, d) => s + d.amount, 0), [debts]);

  const periodTotals = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMon = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMon));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekTransactions = transactions.filter(t => t.date && new Date(t.date) >= monday && new Date(t.date) <= sunday);
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

    return { weekIncome, weekExpense, monthIncome: mIncome, monthExpense: mExpense, yearIncome: yIncome, yearExpense: yExpense, activeYearStr };
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

      {/* TAB: BERANDA */}
      {activeTab === 'beranda' && (
        <div className="p-4 space-y-4">
          {totalCategoryBudget > 0 && (
            <div className="bg-white p-3.5 rounded-2xl border shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${isOverBudget ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-600'}`}>
                  <Target size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Sisa Total Anggaran</p>
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

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1">
                <Calendar size={16} /> Catatan Per Hari
              </h3>
              <button onClick={() => setActiveTab('riwayat')} className="text-xs text-teal-600 font-semibold hover:underline">
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
                            <button onClick={() => openEditModal(t)} className="text-slate-300 hover:text-teal-600 p-1"><Edit2 size={15} /></button>
                            <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={15} /></button>
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

      {/* TAB: ANGGARAN */}
      {activeTab === 'anggaran' && (
        <div className="p-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Target size={14} /> Total Anggaran Bulanan
              </h3>
              <button 
                onClick={openAddBudgetModal}
                className="text-xs bg-teal-600 text-white hover:bg-teal-700 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm"
              >
                <Plus size={14} /> Tambah Anggaran
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Target Pagu</span>
                <span className="text-sm font-bold text-slate-800">{formatRupiah(totalCategoryBudget)}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Terpakai</span>
                <span className="text-sm font-bold text-rose-600">{formatRupiah(monthExpense)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daftar Anggaran Kategori</h3>
              <span className="text-[11px] text-slate-400">{budgetCategoryList.length} Kategori Diatur</span>
            </div>

            {budgetCategoryList.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-2xl bg-slate-50 p-4 space-y-2">
                <PiggyBank size={32} className="mx-auto text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">Belum ada anggaran kategori yang diatur.</p>
                <button 
                  onClick={openAddBudgetModal}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  + Tambah Anggaran Sekarang
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {budgetCategoryList.map(([cat, targetBudget]) => {
                  const spent = categoryExpensesMap[cat] || 0;
                  const targetNum = Number(targetBudget) || 0;
                  const percent = targetNum > 0 ? Math.min(Math.round((spent / targetNum) * 100), 100) : 0;
                  const catOver = targetNum > 0 && spent > targetNum;
                  const catRem = targetNum - spent;

                  return (
                    <div key={cat} className="p-3.5 bg-slate-50 rounded-2xl border space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{cat}</h4>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            Terpakai: <span className="font-bold text-slate-700">{formatRupiah(spent)}</span> dari {formatRupiah(targetNum)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mr-1 ${
                            catOver ? 'bg-rose-100 text-rose-700' : percent > 80 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {catOver ? `Over ${formatRupiah(Math.abs(catRem))}` : `Sisa ${formatRupiah(catRem)}`}
                          </span>
                          <button onClick={() => openEditBudgetModal(cat, targetNum)} className="text-slate-400 hover:text-teal-600 p-1"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteBudget(cat)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${catOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-teal-500'}`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: FITUR LAIN (UTANG & PIUTANG + GOALS) */}
      {activeTab === 'fitur_lain' && (
        <div className="p-4 space-y-4">
          {/* Sub Switcher Utang vs Goals */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-white border rounded-2xl text-xs font-bold shadow-sm">
            <button
              onClick={() => setSubTabFitur('utang')}
              className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${subTabFitur === 'utang' ? 'bg-teal-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <HandCoins size={16} /> Utang & Piutang
            </button>
            <button
              onClick={() => setSubTabFitur('goals')}
              className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${subTabFitur === 'goals' ? 'bg-teal-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Trophy size={16} /> Target Impian (Goals)
            </button>
          </div>

          {/* SUBTAB UTANG & PIUTANG */}
          {subTabFitur === 'utang' && (
            <div className="space-y-4">
              {/* Summary Card Utang & Piutang */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3.5 rounded-2xl border shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Utang Saya (Belum Lunas)</span>
                  <span className="text-sm font-bold text-rose-600">{formatRupiah(totalUtangUnpaid)}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Piutang Saya (Belum Lunas)</span>
                  <span className="text-sm font-bold text-emerald-600">{formatRupiah(totalPiutangUnpaid)}</span>
                </div>
              </div>

              {/* Main Card Utang & Piutang */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catatan Utang & Piutang</h3>
                  <button 
                    onClick={openAddDebtModal}
                    className="text-xs bg-teal-600 text-white hover:bg-teal-700 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={14} /> Tambah Catatan
                  </button>
                </div>

                {debts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Belum ada catatan utang atau piutang.</p>
                ) : (
                  <div className="space-y-2.5">
                    {debts.map((d) => (
                      <div key={d.id} className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${d.isPaid ? 'bg-slate-50 opacity-60 border-slate-200' : 'bg-white shadow-sm border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleDebtPaid(d.id, d.isPaid)}
                            className={`p-2 rounded-xl transition ${d.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 hover:text-emerald-600'}`}
                            title={d.isPaid ? "Tandai Belum Lunas" : "Tandai Lunas"}
                          >
                            <Check size={16} />
                          </button>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${d.type === 'utang' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {d.type === 'utang' ? 'UTANG' : 'PIUTANG'}
                              </span>
                              <h4 className={`text-xs font-bold ${d.isPaid ? 'line-through text-slate-500' : 'text-slate-800'}`}>{d.person}</h4>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                              {d.title} {d.dueDate && `• Tempo: ${d.dueDate}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className={`text-xs font-bold ${d.type === 'utang' ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {formatRupiah(d.amount)}
                            </p>
                            <span className="text-[10px] font-semibold text-slate-400 block">{d.isPaid ? 'Lunas' : 'Belum Lunas'}</span>
                          </div>
                          <button onClick={() => openEditDebtModal(d)} className="text-slate-300 hover:text-teal-600 p-1"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteDebt(d.id)} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBTAB GOALS / TARGET IMPIAN */}
          {subTabFitur === 'goals' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Trophy size={14} /> Target Tabungan & Impian
                  </h3>
                  <button 
                    onClick={openAddGoalModal}
                    className="text-xs bg-teal-600 text-white hover:bg-teal-700 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={14} /> Buat Impian
                  </button>
                </div>

                {goals.length === 0 ? (
                  <div className="text-center py-8 border border-dashed rounded-2xl bg-slate-50 p-4 space-y-2">
                    <Trophy size={32} className="mx-auto text-slate-400" />
                    <p className="text-xs font-semibold text-slate-600">Belum ada target impian yang dibuat.</p>
                    <button 
                      onClick={openAddGoalModal}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow"
                    >
                      + Buat Impian Baru
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {goals.map((g) => {
                      const percent = g.targetAmount > 0 ? Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100) : 0;
                      const isReached = g.currentAmount >= g.targetAmount;

                      return (
                        <div key={g.id} className="p-3.5 bg-slate-50 rounded-2xl border space-y-2.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-slate-800">{g.title}</h4>
                                {isReached && (
                                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                    Tercapai! 🎉
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                Terkumpul: <span className="font-bold text-teal-600">{formatRupiah(g.currentAmount)}</span> dari {formatRupiah(g.targetAmount)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => {
                                  setSelectedGoal(g);
                                  setAddFundAmount('');
                                  setShowAddGoalFundModal(true);
                                }}
                                className="text-[11px] bg-teal-600 hover:bg-teal-700 text-white font-bold px-2.5 py-1 rounded-xl transition flex items-center gap-1 shadow-sm"
                              >
                                <Coins size={12} /> + Tabung
                              </button>
                              <button onClick={() => openEditGoalModal(g)} className="text-slate-400 hover:text-teal-600 p-1"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteGoal(g.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 size={14} /></button>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] font-bold mb-1 text-slate-500">
                              <span>Progress Tabungan</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-teal-500 h-full rounded-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: STATISTIK */}
      {activeTab === 'statistik' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border shadow-sm">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Calendar size={14} /> Pilih Bulan
            </span>
            <input 
              type="month" 
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="text-xs font-semibold bg-slate-100 p-1.5 rounded-lg border focus:outline-teal-500"
            />
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <BarChart3 size={14} /> Pengeluaran per Kategori ({filterMonth})
            </h3>
            {categoryExpenses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada pengeluaran di bulan ini.</p>
            ) : (
              categoryExpenses.map(([cat, total]) => {
                const percent = Math.round((total / (monthExpense || 1)) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700">{cat}</span>
                      <span className="font-bold text-slate-800">{formatRupiah(total)} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full rounded-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <BarChart3 size={14} /> Pemasukan per Kategori ({filterMonth})
            </h3>
            {categoryIncomes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada pemasukan di bulan ini.</p>
            ) : (
              categoryIncomes.map(([cat, total]) => {
                const percent = Math.round((total / (monthIncome || 1)) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700">{cat}</span>
                      <span className="font-bold text-emerald-600">{formatRupiah(total)} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB: RIWAYAT */}
      {activeTab === 'riwayat' && (
        <div className="p-4 space-y-3">
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

          <div className="bg-white p-3 rounded-2xl border shadow-sm space-y-2">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
              <Filter size={14} /> Filter Data
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="p-1.5 bg-slate-50 border rounded-xl font-medium">
                <option value="Semua">Semua Orang</option>
                <option value="Papa">Papa</option>
                <option value="Mama">Mama</option>
              </select>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="p-1.5 bg-slate-50 border rounded-xl font-medium truncate">
                <option value="Semua">Semua Kategori</option>
                {allUniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="p-1.5 bg-slate-50 border rounded-xl font-medium" />
            </div>
            <button onClick={handleExportCSV} className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition">
              <Download size={14} /> Unduh Laporan Excel (CSV)
            </button>
          </div>

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
                    <button onClick={() => openEditModal(t)} className="text-slate-300 hover:text-teal-600 p-1"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Navigasi Bawah Utama */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t p-2 flex justify-around items-center shadow-lg z-40">
        <button 
          onClick={() => setActiveTab('beranda')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[11px] font-semibold ${activeTab === 'beranda' ? 'text-teal-600' : 'text-slate-400'}`}
        >
          <Home size={18} /> Beranda
        </button>

        <button 
          onClick={() => setActiveTab('anggaran')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[11px] font-semibold ${activeTab === 'anggaran' ? 'text-teal-600' : 'text-slate-400'}`}
        >
          <Target size={18} /> Anggaran
        </button>

        <button 
          onClick={openAddModal}
          className="bg-teal-600 hover:bg-teal-700 text-white p-3 rounded-full shadow-lg transition active:scale-95 -mt-5 border-4 border-slate-100"
        >
          <PlusCircle size={24} />
        </button>

        <button 
          onClick={() => setActiveTab('fitur_lain')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[11px] font-semibold ${activeTab === 'fitur_lain' ? 'text-teal-600' : 'text-slate-400'}`}
        >
          <HandCoins size={18} /> Fitur Lain
        </button>

        <button 
          onClick={() => setActiveTab('riwayat')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[11px] font-semibold ${activeTab === 'riwayat' ? 'text-teal-600' : 'text-slate-400'}`}
        >
          <List size={18} /> Riwayat
        </button>
      </div>

      {/* MODAL UTANG & PIUTANG */}
      {showDebtModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800">
                {editingDebtId ? 'Edit Catatan' : 'Tambah Catatan Utang / Piutang'}
              </h3>
              <button onClick={() => setShowDebtModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveDebt} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDebtType('utang')}
                  className={`py-2 rounded-lg transition ${debtType === 'utang' ? 'bg-rose-500 text-white shadow' : 'text-slate-500'}`}
                >
                  Utang Saya
                </button>
                <button
                  type="button"
                  onClick={() => setDebtType('piutang')}
                  className={`py-2 rounded-lg transition ${debtType === 'piutang' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500'}`}
                >
                  Piutang Saya
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  {debtType === 'utang' ? 'Pemberi Pinjaman' : 'Peminjam'}
                </label>
                <input 
                  type="text" 
                  placeholder="Nama orang / pihak"
                  value={debtPerson}
                  onChange={(e) => setDebtPerson(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Keterangan / Catatan</label>
                <input 
                  type="text" 
                  placeholder="Misal: Pinjam uang bensin, Talangan belanja"
                  value={debtTitle}
                  onChange={(e) => setDebtTitle(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Nominal (Rp)</label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Jatuh Tempo (Opsional)</label>
                <input 
                  type="date" 
                  value={debtDueDate}
                  onChange={(e) => setDebtDueDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowDebtModal(false)} className="w-1/2 py-2.5 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
                  Batal
                </button>
                <button type="submit" className="w-1/2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GOALS / TARGET IMPIAN */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800">
                {editingGoalId ? 'Edit Target Impian' : 'Buat Target Impian Baru'}
              </h3>
              <button onClick={() => setShowGoalModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Nama Impian / Goal</label>
                <input 
                  type="text" 
                  placeholder="Misal: Beli Laptop Baru, Liburan Akhir Tahun"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Target Nominal (Rp)</label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={goalTargetAmount}
                  onChange={(e) => setGoalTargetAmount(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Saldo Terkumpul Saat Ini (Rp)</label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={goalCurrentAmount}
                  onChange={(e) => setGoalCurrentAmount(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Target Tanggal (Opsional)</label>
                <input 
                  type="date" 
                  value={goalTargetDate}
                  onChange={(e) => setGoalTargetDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowGoalModal(false)} className="w-1/2 py-2.5 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
                  Batal
                </button>
                <button type="submit" className="w-1/2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition">
                  Simpan Impian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH SALDO TABUNGAN GOAL */}
      {showAddGoalFundModal && selectedGoal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800">Tambah Tabungan: {selectedGoal.title}</h3>
              <button onClick={() => setShowAddGoalFundModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleAddGoalFund} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Nominal yang Ditabung (Rp)</label>
                <input 
                  type="number" 
                  placeholder="Contoh: 100000"
                  value={addFundAmount}
                  onChange={(e) => setAddFundAmount(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddGoalFundModal(false)} className="w-1/2 py-2.5 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
                  Batal
                </button>
                <button type="submit" className="w-1/2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition">
                  Tambah Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANGGARAN KATEGORI */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800">
                {isEditingBudget ? 'Edit Anggaran Kategori' : 'Tambah Anggaran Kategori'}
              </h3>
              <button onClick={() => setShowBudgetModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-3.5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Kategori Pengeluaran</label>
                  {!isEditingBudget && (
                    <button 
                      type="button"
                      onClick={() => setIsNewBudgetCatCustom(!isNewBudgetCatCustom)}
                      className="text-[11px] text-teal-600 font-semibold hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={12} /> {isNewBudgetCatCustom ? 'Pilih Kategori Bawaan' : 'Buat Kategori Baru'}
                    </button>
                  )}
                </div>

                {isEditingBudget ? (
                  <input type="text" value={budgetCatName} disabled className="w-full p-2.5 text-xs bg-slate-100 border rounded-xl font-bold text-slate-600" />
                ) : isNewBudgetCatCustom ? (
                  <input 
                    type="text" 
                    placeholder="Nama kategori pengeluaran baru"
                    value={customBudgetCatName}
                    onChange={(e) => setCustomBudgetCatName(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                    required
                  />
                ) : (
                  <select 
                    value={budgetCatName} 
                    onChange={(e) => setBudgetCatName(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Batas Anggaran Bulanan (Rp)</label>
                <input 
                  type="number" 
                  placeholder="Contoh: 1500000"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowBudgetModal(false)} className="w-1/2 py-2.5 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
                  Batal
                </button>
                <button type="submit" className="w-1/2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition">
                  {isEditingBudget ? 'Simpan Perubahan' : 'Tambah Anggaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INPUT & EDIT TRANSAKSI */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800">
                {editingId ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Tanggal</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500" required />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Pencatat</label>
                  <select value={user} onChange={(e) => setUser(e.target.value)} className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500">
                    <option value="Papa">Papa</option>
                    <option value="Mama">Mama</option>
                  </select>
                </div>
              </div>

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
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-medium focus:outline-teal-500">
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

              <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition">
                {editingId ? 'Simpan Perubahan' : 'Tambah Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
