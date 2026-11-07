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
  Coins,
  RotateCcw,
  ChevronDown,
  ChevronUp
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
  const [initialBalance, setInitialBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Navigation States
  const [activeTab, setActiveTab] = useState('beranda'); // 'beranda', 'anggaran', 'fitur_lain', 'statistik', 'riwayat'
  const [subTabFitur, setSubTabFitur] = useState('utang'); // 'utang', 'goals'
  const [selectedStatCategory, setSelectedStatCategory] = useState(null); // Expand kategori di statistik

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAddGoalFundModal, setShowAddGoalFundModal] = useState(false);
  const [showInitialBalanceModal, setShowInitialBalanceModal] = useState(false);

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

  // Form States Saldo Awal
  const [inputInitialBalance, setInputInitialBalance] = useState('0');

  // Form States Modal Anggaran
  const [budgetCatName, setBudgetCatName] = useState('');
  const [isNewBudgetCatCustom, setIsNewBudgetCatCustom] = useState(false);
  const [customBudgetCatName, setCustomBudgetCatName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isEditingBudget, setIsEditingBudget] = useState(false);

  // Form States Utang & Piutang
  const [editingDebtId, setEditingDebtId] = useState(null);
  const [debtType, setDebtType] = useState('utang');
  const [debtPerson, setDebtPerson] = useState('');
  const [debtTitle, setDebtTitle] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');

  // Form States Goals
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

    // 5. Saldo Awal Bulan
    const unsubInitBalance = onSnapshot(doc(db, "settings", "initialBalance"), (docSnap) => {
      if (docSnap.exists()) {
        const val = docSnap.data().amount || 0;
        setInitialBalance(val);
        setInputInitialBalance(val.toString());
      } else {
        setInitialBalance(0);
        setInputInitialBalance('0');
      }
    });

    return () => {
      unsubTrans();
      unsubBudgets();
      unsubDebts();
      unsubGoals();
      unsubInitBalance();
    };
  }, []);

  // --- ACTIONS: SALDO AWAL ---
  const handleSaveInitialBalance = async (e) => {
    e.preventDefault();
    const val = Number(inputInitialBalance) || 0;
    try {
      await setDoc(doc(db, "settings", "initialBalance"), {
        amount: val,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setShowInitialBalanceModal(false);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan saldo awal.");
    }
  };

  const handleResetInitialBalanceToZero = async () => {
    try {
      await setDoc(doc(db, "settings", "initialBalance"), {
        amount: 0,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setInputInitialBalance('0');
      setShowInitialBalanceModal(false);
    } catch (err) {
      console.error(err);
      alert("Gagal mereset saldo awal.");
    }
  };

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
        updatedAt:
