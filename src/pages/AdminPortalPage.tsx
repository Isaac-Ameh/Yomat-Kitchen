import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  Clock,
  Download,
  Edit,
  ExternalLink,
  FileSpreadsheet,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  Trash2,
  Upload,
  UserCog,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useAppAuth } from '../context/AppAuthContext';
import { useMenu } from '../context/MenuContext';
import { parseApiJson } from '../lib/api';
import { AVAILABLE_DISH_IMAGES, DEFAULT_WEBSITE_SETTINGS, formatNaira } from '../data/meals';
import { WebsiteSettings } from '../types/menu';
import { RESEARCH_DATE } from '../data/pricingResearch';

type AdminTab =
  | 'overview'
  | 'menu'
  | 'orders'
  | 'catering'
  | 'customers'
  | 'staff'
  | 'analytics'
  | 'reports'
  | 'reviews'
  | 'ai_insights'
  | 'website'
  | 'activity';

interface OverviewData {
  metrics: {
    totalOrdersToday: number;
    revenueToday: number | null;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
  };
  recentOrders: Array<{
    reference: string;
    email: string;
    total_naira: number;
    status: string;
    payment_status: string;
    created_at: string;
  }>;
  popularMeals: Array<{
    mealId: string;
    name: string;
    count: number;
    revenue: number;
  }>;
  databaseConnected: boolean;
}

interface OrderItem {
  meal_id: string;
  name: string;
  unit_price_naira: number;
  quantity: number;
  line_total_naira: number;
}

interface AdminOrder {
  reference: string;
  owner_id: string;
  email: string;
  total_naira: number;
  expected_amount_kobo: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid';
  channel?: string;
  paid_at?: string;
  created_at: string;
  order_items?: OrderItem[];
}

interface AdminMeal {
  id: string;
  name: string;
  category: string;
  short_description: string;
  full_description: string;
  price_naira: number;
  price_confirmed?: boolean;
  image: string;
  is_available: boolean;
  is_featured: boolean;
}

interface PricingProposalItem {
  mealId: string;
  dishName: string;
  category: string;
  observedBeninRangeNaira: [number, number];
  proposedRecommendedPriceNaira: number;
  rationale: string;
  researchDate: string;
  isEstimateRecommendation: boolean;
  sources: Array<{
    restaurantName: string;
    locationNote: string;
    observedItemAndPrice: string;
    url: string;
  }>;
  currentPublishedPriceNaira: number | null;
  isCurrentlyConfirmed: boolean;
}

interface AdminCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface CateringEnquiry {
  id: string;
  clientName: string;
  phone: string;
  email: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  requestedDishes: string;
  notes: string;
  status: 'new' | 'quoted' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

interface AdminCustomer {
  userId: string;
  fullName: string | null;
  email: string;
  role: string;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

interface StaffProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface StaffInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface ReportOrderRow {
  reference: string;
  email: string;
  total_naira: number;
  status: string;
  payment_status: string;
  created_at: string;
}

interface ActivityLogRow {
  id?: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  target: string;
  outcome: string;
  reason?: string | null;
  created_at: string;
}

interface AdminReviewRecord {
  id: string;
  orderReference: string;
  mealId: string;
  mealName: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  rating: number;
  foodQuality: number;
  foodTaste: number;
  portionSize: number;
  packaging: number;
  serviceExperience: number;
  comment: string;
  isVerifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'hidden';
  createdAt: string;
}

interface AiInsightsReport {
  executiveSummary: string;
  businessPerformanceOverview: string;
  customerSatisfaction: string;
  customerSentimentAnalysis: string;
  strengths: string[];
  areasForImprovement: string[];
  bestPerformingMeals: string[];
  mealsNeedingAttention: string[];
  salesAndOrderingTrends: string[];
  businessOpportunities: string[];
  aiRecommendations: string[];
  managementActionPlan: string[];
  dataCoverageNote: string;
}

export function AdminPortalPage() {
  const { fullName, email, role, isManager, getToken, signOut } = useAppAuth();
  const { refreshMenuAndSettings } = useMenu();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [adminReviews, setAdminReviews] = useState<AdminReviewRecord[]>([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState('all');

  const [aiPeriod, setAiPeriod] = useState('monthly');
  const [aiTopic, setAiTopic] = useState('complete');
  const [aiReport, setAiReport] = useState<AiInsightsReport | null>(null);
  const [generatingAiReport, setGeneratingAiReport] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'manager' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello! I am your AI Business Assistant for Yomat Kitchen. Ask me anything about customer reviews, popular dishes, revenue trends, or staff performance.' },
  ]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [sendingAiChat, setSendingAiChat] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  const [menuItems, setMenuItems] = useState<AdminMeal[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [proposals, setProposals] = useState<PricingProposalItem[]>([]);
  const [draftPrices, setDraftPrices] = useState<Record<string, number>>({});
  const [selectedProposals, setSelectedProposals] = useState<Record<string, boolean>>({});
  const [allowOverwriteConfirmed, setAllowOverwriteConfirmed] = useState(false);
  const [approvingPrices, setApprovingPrices] = useState(false);

  const [cateringList, setCateringList] = useState<CateringEnquiry[]>([]);
  const [cateringFormOpen, setCateringFormOpen] = useState(false);
  const [cateringForm, setCateringForm] = useState({
    clientName: '',
    phone: '',
    email: '',
    eventType: 'Campus / Event Catering',
    eventDate: '',
    guestCount: 30,
    requestedDishes: '',
    notes: '',
  });

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  const [analytics, setAnalytics] = useState<{
    totalPaidRevenue: number;
    totalPendingRevenue: number;
    totalOrders: number;
    paidOrders: number;
    averageOrderValue: number;
  } | null>(null);

  const [reportFilters, setReportFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    paymentStatus: 'all',
  });
  const [reportRows, setReportRows] = useState<ReportOrderRow[]>([]);
  const [reportSummary, setReportSummary] = useState({
    matchingOrders: 0,
    filteredPaidRevenue: 0,
  });

  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState<'staff' | 'owner'>('staff');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);

  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<AdminMeal | null>(null);
  const [mealForm, setMealForm] = useState({
    name: '',
    category: 'Main Dishes & Meals',
    shortDescription: '',
    fullDescription: '',
    priceNaira: 0,
    image: '/src/assets/images/dish_jollof_chicken.jpg',
    isAvailable: true,
    isFeatured: false,
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [loadingData, setLoadingData] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessBanner(msg);
    window.setTimeout(() => setSuccessBanner(null), 4000);
  };

  // Enforce allowed tabs cleanly in UI as defense-in-depth alongside backend RBAC
  useEffect(() => {
    if (!isManager && activeTab !== 'overview' && activeTab !== 'orders') {
      setActiveTab('overview');
    }
  }, [isManager, activeTab]);

  const loadNotifications = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/admin/notifications', {
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiJson<{ notifications?: NotificationItem[] }>(res);
      if (Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch {
      // Ignore background poll failures
    }
  }, [getToken]);

  const loadReports = useCallback(
    async (token: string) => {
      const params = new URLSearchParams();
      if (reportFilters.startDate) params.set('startDate', reportFilters.startDate);
      if (reportFilters.endDate) params.set('endDate', reportFilters.endDate);
      if (reportFilters.status !== 'all') params.set('status', reportFilters.status);
      if (reportFilters.paymentStatus !== 'all') {
        params.set('paymentStatus', reportFilters.paymentStatus);
      }
      const res = await fetch(`/api/admin/reports?${params.toString()}`, {
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiJson<{
        orders?: ReportOrderRow[];
        summary?: { matchingOrders: number; filteredPaidRevenue: number };
      }>(res);
      setReportRows(data.orders || []);
      if (data.summary) setReportSummary(data.summary);
    },
    [reportFilters]
  );

  const loadTabData = useCallback(
    async (tab: AdminTab) => {
      setLoadingData(true);
      setErrorBanner(null);
      try {
        const token = await getToken();
        if (!token) throw new Error('Session expired. Please sign in again.');

        if (tab === 'overview') {
          const res = await fetch('/api/admin/overview', {
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${token}` },
          });
          setOverview(await parseApiJson<OverviewData>(res));
        } else if (tab === 'orders') {
          const url =
            orderStatusFilter === 'all'
              ? '/api/admin/orders'
              : `/api/admin/orders?status=${orderStatusFilter}`;
          const res = await fetch(url, {
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await parseApiJson<{ orders?: AdminOrder[] }>(res);
          setOrders(data.orders || []);
        } else if (tab === 'menu' && isManager) {
          const [menuRes, catRes, propRes] = await Promise.all([
            fetch('/api/admin/menu', {
              credentials: 'same-origin',
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch('/api/admin/categories', {
              credentials: 'same-origin',
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch('/api/admin/pricing-proposals', {
              credentials: 'same-origin',
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          const menuData = await parseApiJson<{ menu?: AdminMeal[] }>(menuRes);
          const catData = await parseApiJson<{ categories?: AdminCategory[] }>(catRes);
          const propData = await parseApiJson<{ proposals?: PricingProposalItem[] }>(propRes);
          setMenuItems(menuData.menu || []);
          setCategories(catData.categories || []);
          const propList = propData.proposals || [];
          setProposals(propList);

          const initialDrafts: Record<string, number> = {};
          const initialSelected: Record<string, boolean> = {};
          for (const p of propList) {
            initialDrafts[p.mealId] =
              p.currentPublishedPriceNaira && p.currentPublishedPriceNaira > 0
                ? p.currentPublishedPriceNaira
                : p.proposedRecommendedPriceNaira;
            initialSelected[p.mealId] = !p.isCurrentlyConfirmed;
          }
          setDraftPrices(initialDrafts);
          setSelectedProposals(initialSelected);
        } else if (tab === 'catering' && isManager) {
          const res = await fetch('/api/admin/catering', {
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await parseApiJson<{ enquiries?: CateringEnquiry[] }>(res);
          setCateringList(data.enquiries || []);
        } else if (tab === 'customers' && isManager) {
          const res = await fetch('/api/admin/customers', {
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await parseApiJson<{ customers?: AdminCustomer[] }>(res);
          setCustomers(data.customers || []);
        } else if (tab === 'analytics' && isManager) {
          const res = await fetch('/api/admin/analytics', {
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${token}` },
          });
          setAnalytics(
            await parseApiJson<{
              totalPaidRevenue: number;
              totalPendingRevenue: number;
              totalOrders: number;
              paidOrders: number;
              averageOrderValue: number;
            }>(res)
          );
        } else if (tab === 'reports' && isManager) {
          await loadReports(token);
        } else if (tab === 'staff' && isManager) {
          const res = await fetch('/api/admin/staff', {
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await parseApiJson<{
            staff?: StaffProfile[];
            invitations?: StaffInvitation[];
          }>(res);
          setStaffList(data.staff || []);
          setInvitations(data.invitations || []);
        } else if (tab === 'website' && isManager) {
          const res = await fetch('/api/admin/settings', {
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await parseApiJson<{ settings?: Partial<WebsiteSettings> }>(res);
          if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings }));
        } else if (tab === 'activity' && isManager) {
          const res = await fetch('/api/admin/activity-logs', {
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await parseApiJson<{ logs?: ActivityLogRow[] }>(res);
          setActivityLogs(data.logs || []);
        } else if (tab === 'reviews' && isManager) {
          const res = await fetch('/api/admin/reviews', {
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await parseApiJson<{ reviews?: AdminReviewRecord[] }>(res);
          setAdminReviews(data.reviews || []);
        } else if (tab === 'ai_insights' && isManager) {
          if (!aiReport) {
            await handleGenerateAiReport(token, 'monthly', 'complete');
          }
        }
      } catch (err) {
        setErrorBanner(err instanceof Error ? err.message : 'Failed to load portal data.');
      } finally {
        setLoadingData(false);
      }
    },
    [getToken, orderStatusFilter, isManager, loadReports]
  );

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    void loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  const handleUpdateOrderStatus = async (reference: string, status: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(reference)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error || 'Failed to update order status.');
      }
      await loadTabData('orders');
      if (selectedOrder) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: status as AdminOrder['status'] } : null
        );
      }
      showSuccess(`Order ${reference} updated to ${status}.`);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Error updating order.');
    }
  };

  const handleApprovePricing = async (
    entries: Array<{ mealId: string; priceNaira: number; explicitOverwrite?: boolean }>,
    overwriteConfirmed: boolean
  ) => {
    if (entries.length === 0) {
      setErrorBanner('Select at least one dish price to approve.');
      return;
    }
    setApprovingPrices(true);
    setErrorBanner(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/admin/pricing-proposals/approve', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          approvals: entries,
          overwriteConfirmed,
        }),
      });
      const data = await parseApiJson<{
        approvedCount?: number;
        skippedConfirmed?: string[];
        error?: string;
      }>(res, 'Failed to approve proposed pricing.');

      await Promise.all([loadTabData('menu'), refreshMenuAndSettings()]);
      const skippedNote =
        data.skippedConfirmed && data.skippedConfirmed.length > 0
          ? ` Skipped already-confirmed dishes (${data.skippedConfirmed.join(', ')}) because overwrite was not checked.`
          : '';
      showSuccess(
        `Approved and published ${data.approvedCount ?? 0} menu price(s) to Our Menu.${skippedNote}`
      );
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to approve pricing.');
    } finally {
      setApprovingPrices(false);
    }
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      if (!token) return;

      const url = editingMeal
        ? `/api/admin/menu/${encodeURIComponent(editingMeal.id)}`
        : '/api/admin/menu';
      const method = editingMeal ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(mealForm),
      });

      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error || 'Failed to save dish.');
      }

      setMealModalOpen(false);
      setEditingMeal(null);
      await Promise.all([loadTabData('menu'), refreshMenuAndSettings()]);
      showSuccess('Menu dish saved and storefront synced.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Error saving dish.');
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/menu/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete dish.');
      }
      await Promise.all([loadTabData('menu'), refreshMenuAndSettings()]);
      showSuccess('Dish removed from menu.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Error deleting dish.');
    }
  };

  const handleDishImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300_000) {
      setErrorBanner('Image file must be 300KB or smaller. Choose a smaller photo or use a URL.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMealForm((prev) => ({ ...prev, image: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCategoryName }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to create category.');
      setNewCategoryName('');
      await loadTabData('menu');
      showSuccess('Menu category added.');
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Error creating category.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/categories/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to delete category.');
      await loadTabData('menu');
      showSuccess('Category removed.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Error deleting category.');
    }
  };

  const handleCreateCatering = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/admin/catering', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cateringForm),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to record catering enquiry.');
      setCateringFormOpen(false);
      setCateringForm({
        clientName: '',
        phone: '',
        email: '',
        eventType: 'Campus / Event Catering',
        eventDate: '',
        guestCount: 30,
        requestedDishes: '',
        notes: '',
      });
      await loadTabData('catering');
      showSuccess('Catering enquiry recorded.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Error recording catering enquiry.');
    }
  };

  const handleUpdateCateringStatus = async (id: string, status: CateringEnquiry['status']) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/catering/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update catering status.');
      await loadTabData('catering');
      showSuccess('Catering status updated.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Error updating catering enquiry.');
    }
  };

  const handleDeleteCatering = async (id: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/catering/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to remove catering enquiry.');
      await loadTabData('catering');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Error deleting catering enquiry.');
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/admin/staff/invitations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: newInviteEmail, role: newInviteRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation.');
      setNewInviteEmail('');
      await loadTabData('staff');
      showSuccess('Team invitation created.');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Error inviting staff.');
    }
  };

  const handleModerateReview = async (reviewId: string, newStatus: 'approved' | 'hidden' | 'deleted') => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await parseApiJson<{ success?: boolean; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || 'Failed to update review status.');
      await loadTabData('reviews');
      showSuccess(`Review status updated to ${newStatus}.`);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Error updating review.');
    }
  };

  const handleGenerateAiReport = async (overrideToken?: string, periodParam?: string, topicParam?: string) => {
    setGeneratingAiReport(true);
    setErrorBanner(null);
    try {
      const token = overrideToken || (await getToken());
      if (!token) return;
      const res = await fetch('/api/admin/ai-insights', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          period: periodParam || aiPeriod,
          topic: topicParam || aiTopic,
        }),
      });
      const data = await parseApiJson<{ report?: AiInsightsReport; error?: string }>(res);
      if (!res.ok || !data.report) throw new Error(data.error || 'Failed to generate AI business report.');
      setAiReport(data.report);
      showSuccess('AI Management Insights report generated successfully!');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Error generating AI insights.');
    } finally {
      setGeneratingAiReport(false);
    }
  };

  const handleSendAiChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiChatInput.trim() || sendingAiChat) return;
    const question = aiChatInput.trim();
    setAiChatInput('');
    setAiChatMessages((prev) => [...prev, { sender: 'manager', text: question }, { sender: 'ai', text: 'Thinking...' }]);
    setSendingAiChat(true);

    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question }),
      });
      const data = await parseApiJson<{ answer?: string; error?: string }>(res);
      const answer = data.answer || data.error || 'No response generated.';
      setAiChatMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { sender: 'ai', text: answer };
        return next;
      });
    } catch (err) {
      setAiChatMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { sender: 'ai', text: 'Error connecting to AI Business Assistant.' };
        return next;
      });
    } finally {
      setSendingAiChat(false);
    }
  };

  const handleChangeStaffRole = async (userId: string, nextRole: 'staff' | 'owner') => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/staff/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to change team role.');
      await loadTabData('staff');
      showSuccess('Team member role updated.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Error updating role.');
    }
  };

  const handleRevokeStaff = async (userId: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/admin/staff/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to revoke access.');
      await loadTabData('staff');
      showSuccess('Staff access revoked.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Error revoking staff.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error('Failed to save website settings.');
      await refreshMenuAndSettings();
      showSuccess('Website content and restaurant details updated across the public storefront.');
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Error saving settings.');
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;

  const navItems: Array<{
    key: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    managerOnly?: boolean;
  }> = [
    { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'orders', label: 'Order Management', icon: ShoppingBag },
    { key: 'menu', label: 'Menu & Pricing', icon: ChefHat, managerOnly: true },
    { key: 'catering', label: 'Catering Management', icon: CalendarDays, managerOnly: true },
    { key: 'customers', label: 'Customer Management', icon: Users, managerOnly: true },
    { key: 'staff', label: 'Staff Management', icon: UserCog, managerOnly: true },
    { key: 'analytics', label: 'Analytics', icon: BarChart3, managerOnly: true },
    { key: 'reports', label: 'Reports', icon: FileSpreadsheet, managerOnly: true },
    { key: 'website', label: 'Website Management', icon: Globe, managerOnly: true },
    { key: 'reviews', label: 'Customer Reviews', icon: Star, managerOnly: true },
    { key: 'ai_insights', label: 'AI Business Insights', icon: Sparkles, managerOnly: true },
    { key: 'activity', label: 'Activity Logs', icon: Activity, managerOnly: true },
  ];

  const visibleNavItems = navItems.filter((item) => !item.managerOnly || isManager);
  const roleLabel = isManager ? 'Manager' : 'Staff (Orders Only)';

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col md:flex-row">
      {/* Persistent Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#5A0B1E] text-[#FAF7F2] shrink-0 border-r border-white/10">
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <Link to="/" className="font-display text-2xl font-semibold tracking-tight text-white">
            Yomat Kitchen
          </Link>
        </div>

        <nav aria-label="Admin navigation" className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-[#FAF7F2]/80 hover:text-white hover:bg-white/8'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3.5 py-3 bg-white/5 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[#B91C1C] text-white flex items-center justify-center font-bold text-xs">
              {(fullName || email || 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{fullName || 'Portal User'}</p>
              <p className="text-xs text-[#86EFAC]">{roleLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#FFFFFF] border-b border-[#1C1917]/10 h-16 sm:h-20 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-lg text-[#1C1917] hover:bg-[#F3EEE6]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-semibold text-[#1C1917]">
                {visibleNavItems.find((i) => i.key === activeTab)?.label || 'Dashboard'}
              </h1>
              <p className="hidden sm:block text-xs text-[#57534E]">
                Role: {roleLabel} ({role})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                aria-label="Toggle notifications"
                className="relative p-2.5 rounded-lg border border-[#1C1917]/15 text-[#1C1917] hover:bg-[#F3EEE6] transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#B91C1C] text-white rounded-full text-xs font-bold flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FFFFFF] rounded-xl border border-[#1C1917]/15 shadow-xl py-3 z-50">
                  <div className="px-4 pb-2 border-b border-[#1C1917]/10 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#1C1917]">Notifications</h3>
                    <span className="text-xs text-[#57534E]">{notifications.length} recent</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#1C1917]/8">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-[#57534E]">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="px-4 py-3 hover:bg-[#FAF7F2] transition-colors">
                          <p className="text-xs font-semibold text-[#1C1917]">{n.title}</p>
                          <p className="text-xs text-[#57534E] mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#1C1917]/15 text-sm font-medium text-[#1C1917] hover:bg-[#F3EEE6] transition-colors"
            >
              <Store className="w-4 h-4" />
              <span>Storefront</span>
            </Link>

            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Sign out"
              className="p-2.5 rounded-lg border border-[#1C1917]/15 text-[#B91C1C] hover:bg-[#B91C1C]/8 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#5A0B1E] text-[#FAF7F2] px-4 py-4 space-y-1.5 border-b border-white/10 z-40">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
                    activeTab === item.key ? 'bg-white/15 text-white' : 'text-[#FAF7F2]/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
          {errorBanner && (
            <div className="p-4 rounded-xl bg-[#B91C1C]/10 border border-[#B91C1C]/20 text-sm text-[#B91C1C] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{errorBanner}</p>
              </div>
              <button type="button" onClick={() => setErrorBanner(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successBanner && (
            <div className="p-4 rounded-xl bg-[#15803D]/10 border border-[#15803D]/25 text-sm text-[#15803D] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p>{successBanner}</p>
              </div>
              <button type="button" onClick={() => setSuccessBanner(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loadingData && (
            <div className="text-xs text-[#57534E] font-medium">Loading latest data...</div>
          )}

          {/* ================= 1. DASHBOARD OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 ${
                  isManager ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
                } gap-4`}
              >
                {[
                  {
                    label: "Today's Orders",
                    value: overview?.metrics.totalOrdersToday ?? 0,
                    icon: ShoppingBag,
                    show: true,
                  },
                  {
                    label: "Today's Revenue",
                    value: formatNaira(overview?.metrics.revenueToday ?? 0),
                    icon: BarChart3,
                    show: isManager && overview?.metrics.revenueToday !== null,
                  },
                  {
                    label: 'Pending Orders',
                    value: overview?.metrics.pendingOrders ?? 0,
                    icon: Clock,
                    show: true,
                  },
                  {
                    label: 'Completed',
                    value: overview?.metrics.completedOrders ?? 0,
                    icon: CheckCircle2,
                    show: true,
                  },
                  {
                    label: 'Cancelled',
                    value: overview?.metrics.cancelledOrders ?? 0,
                    icon: XCircle,
                    show: true,
                  },
                ]
                  .filter((s) => s.show)
                  .map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={i}
                        className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                            {stat.label}
                          </span>
                          <div className="w-8 h-8 rounded-lg bg-[#5A0B1E]/8 text-[#5A0B1E] flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="tabular-nums font-display text-2xl font-semibold text-[#1C1917]">
                          {stat.value}
                        </p>
                      </div>
                    );
                  })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                      Recent Orders
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="text-xs font-medium text-[#5A0B1E] hover:underline cursor-pointer"
                    >
                      Open Order Queue &rarr;
                    </button>
                  </div>

                  <div className="divide-y divide-[#1C1917]/8">
                    {!overview?.recentOrders || overview.recentOrders.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[#57534E]">
                        No orders recorded yet. Customer orders placed online appear here.
                      </p>
                    ) : (
                      overview.recentOrders.map((ord) => (
                        <div
                          key={ord.reference}
                          className="py-3.5 flex items-center justify-between gap-4"
                        >
                          <div>
                            <p className="text-xs font-semibold text-[#1C1917]">{ord.reference}</p>
                            <p className="text-xs text-[#57534E] truncate max-w-xs">{ord.email}</p>
                          </div>
                          <div className="text-right">
                            {isManager && (
                              <p className="tabular-nums text-sm font-semibold text-[#15803D]">
                                {formatNaira(ord.total_naira)}
                              </p>
                            )}
                            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#1C1917]/8 text-[#57534E]">
                              {ord.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  {isManager ? (
                    <>
                      <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-6 space-y-4">
                        <h2 className="font-display text-lg font-semibold text-[#1C1917]">
                          Popular Dishes
                        </h2>
                        <div className="space-y-3">
                          {!overview?.popularMeals || overview.popularMeals.length === 0 ? (
                            <p className="text-xs text-[#57534E]">No item order data yet.</p>
                          ) : (
                            overview.popularMeals.map((meal) => (
                              <div
                                key={meal.mealId}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-[#1C1917] truncate max-w-[180px]">
                                  {meal.name}
                                </span>
                                <span className="tabular-nums font-semibold text-[#15803D]">
                                  {meal.count} ordered
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="bg-[#5A0B1E] text-[#FAF7F2] rounded-xl p-6 space-y-4">
                        <h3 className="font-display text-lg font-semibold">
                          Menu Pricing &amp; Publishing
                        </h3>
                        <p className="text-xs text-[#FAF7F2]/85 leading-relaxed">
                          Review researched Benin City food price proposals before publishing Naira
                          prices to Our Menu.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('menu')}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-medium transition-colors cursor-pointer"
                        >
                          <ChefHat className="w-4 h-4" />
                          <span>Review Proposed Prices</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-[#5A0B1E] text-[#FAF7F2] rounded-xl p-6 space-y-3">
                      <h3 className="font-display text-lg font-semibold">Staff Order Desk</h3>
                      <p className="text-xs text-[#FAF7F2]/85 leading-relaxed">
                        You are signed in with Staff access. You can view customer orders, inspect
                        line items, and update kitchen processing status.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className="w-full px-4 py-2.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-sm font-medium transition-colors cursor-pointer"
                      >
                        Go to Order Management
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= 2. MENU & PRICING APPROVAL (MANAGER ONLY) ================= */}
          {activeTab === 'menu' && isManager && (
            <div className="space-y-10">
              {/* Benin City Pricing Research Review & Approval Module */}
              <div className="bg-[#FFFFFF] rounded-xl border border-[#5A0B1E]/20 p-6 sm:p-7 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-[#1C1917]/10">
                  <div className="space-y-2 max-w-3xl">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#B91C1C]">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Manager Pricing Approval Workflow (Research Date: {RESEARCH_DATE})</span>
                    </span>
                    <h2 className="font-display text-2xl font-semibold text-[#1C1917]">
                      Benin City / Uselu Proposed Menu Pricing Review
                    </h2>
                    <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                      These draft recommendations are based on observed Benin City / UNIBEN-corridor
                      restaurant benchmarks and are held privately in this panel until explicitly
                      approved by the Manager. You may edit any Naira amount before approving.
                      Already-confirmed dishes are never overwritten unless you explicitly opt in.
                    </p>
                  </div>

                  <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
                    <label className="inline-flex items-center gap-2 text-xs text-[#57534E] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowOverwriteConfirmed}
                        onChange={(e) => setAllowOverwriteConfirmed(e.target.checked)}
                        className="w-4 h-4 rounded border-[#1C1917]/20 text-[#5A0B1E]"
                      />
                      <span>Allow overwriting already-confirmed prices</span>
                    </label>
                    <button
                      type="button"
                      disabled={approvingPrices}
                      onClick={() => {
                        const batch = proposals
                          .filter((p) => selectedProposals[p.mealId])
                          .map((p) => ({
                            mealId: p.mealId,
                            priceNaira:
                              Number(draftPrices[p.mealId]) || p.proposedRecommendedPriceNaira,
                          }));
                        void handleApprovePricing(batch, allowOverwriteConfirmed);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {approvingPrices ? 'Publishing...' : 'Approve & Publish Selected Prices'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#FAF7F2] border-b border-[#1C1917]/10 text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                        <th className="py-3 px-3">Select</th>
                        <th className="py-3 px-3">Dish</th>
                        <th className="py-3 px-3">Published Status</th>
                        <th className="py-3 px-3">Benin City Benchmark &amp; Sources</th>
                        <th className="py-3 px-3">Recommended</th>
                        <th className="py-3 px-3">Manager Price (₦)</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1C1917]/8">
                      {proposals.map((prop) => (
                        <tr key={prop.mealId} className="align-top hover:bg-[#FAF7F2]/60">
                          <td className="py-4 px-3">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedProposals[prop.mealId])}
                              onChange={(e) =>
                                setSelectedProposals((prev) => ({
                                  ...prev,
                                  [prop.mealId]: e.target.checked,
                                }))
                              }
                              aria-label={`Select ${prop.dishName}`}
                              className="w-4 h-4 rounded border-[#1C1917]/25"
                            />
                          </td>
                          <td className="py-4 px-3">
                            <p className="font-semibold text-[#1C1917]">{prop.dishName}</p>
                            <p className="text-xs text-[#57534E]">{prop.category}</p>
                          </td>
                          <td className="py-4 px-3">
                            {prop.isCurrentlyConfirmed && prop.currentPublishedPriceNaira ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#15803D]/12 text-[#15803D] text-xs font-semibold tabular-nums">
                                Confirmed: {formatNaira(prop.currentPublishedPriceNaira)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#D97706]/12 text-[#B45309] text-xs font-semibold">
                                Unconfirmed (Contact for Price)
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-3 max-w-xs space-y-1.5">
                            <p className="text-xs font-semibold text-[#1C1917] tabular-nums">
                              Observed Range: {formatNaira(prop.observedBeninRangeNaira?.[0] ?? 0)} –{' '}
                              {formatNaira(prop.observedBeninRangeNaira?.[1] ?? 0)}
                            </p>
                            <p className="text-xs text-[#57534E] leading-relaxed">{prop.rationale}</p>
                            <div className="flex flex-wrap gap-2 pt-0.5">
                              {(prop.sources || []).map((src, idx) => (
                                <a
                                  key={idx}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-[#5A0B1E] hover:underline"
                                >
                                  <span>
                                    {src.restaurantName} ({src.observedItemAndPrice})
                                  </span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-3 tabular-nums font-medium text-[#57534E]">
                            {formatNaira(prop.proposedRecommendedPriceNaira)}
                            <span className="block text-[10px] text-[#57534E]/80">
                              Est. recommendation
                            </span>
                          </td>
                          <td className="py-4 px-3">
                            <input
                              type="number"
                              min={100}
                              step={50}
                              value={draftPrices[prop.mealId] ?? prop.proposedRecommendedPriceNaira}
                              onChange={(e) =>
                                setDraftPrices((prev) => ({
                                  ...prev,
                                  [prop.mealId]: Number(e.target.value),
                                }))
                              }
                              className="w-28 px-2.5 py-1.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm font-semibold tabular-nums text-[#1C1917]"
                            />
                          </td>
                          <td className="py-4 px-3 text-right">
                            <button
                              type="button"
                              disabled={approvingPrices}
                              onClick={() =>
                                void handleApprovePricing(
                                  [
                                    {
                                      mealId: prop.mealId,
                                      priceNaira:
                                        Number(draftPrices[prop.mealId]) ||
                                        prop.proposedRecommendedPriceNaira,
                                      explicitOverwrite: true,
                                    },
                                  ],
                                  true
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              {prop.isCurrentlyConfirmed ? 'Update Price' : 'Approve & Publish'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Categories Inline Manager */}
              <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-[#1C1917]">
                      Menu Categories ({categories.length})
                    </h3>
                    <p className="text-xs text-[#57534E]">
                      Organize dishes shown on Our Menu.
                    </p>
                  </div>
                  <form onSubmit={handleCreateCategory} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="New category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="px-3.5 py-2 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-xs text-[#1C1917]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-white text-xs font-semibold cursor-pointer"
                    >
                      Add Category
                    </button>
                  </form>
                </div>
                {categoryError && <p className="text-xs text-[#B91C1C]">{categoryError}</p>}
                <div className="flex flex-wrap gap-2.5">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#1C1917]/10 text-xs font-medium"
                    >
                      <span>{cat.name}</span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteCategory(cat.id)}
                        aria-label={`Delete category ${cat.name}`}
                        className="text-[#57534E] hover:text-[#B91C1C] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Complete Menu Catalog Management */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                    Menu Catalog ({menuItems.length} dishes)
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMeal(null);
                      setMealForm({
                        name: '',
                        category: 'Main Dishes & Meals',
                        shortDescription: '',
                        fullDescription: '',
                        priceNaira: 0,
                        image: '/src/assets/images/dish_jollof_chicken.jpg',
                        isAvailable: true,
                        isFeatured: false,
                      });
                      setMealModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#5A0B1E] text-white text-sm font-medium hover:bg-[#731129] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Dish</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {menuItems.map((meal) => (
                    <div
                      key={meal.id}
                      className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="aspect-[4/3] bg-[#F3EEE6] relative overflow-hidden">
                          <img
                            src={meal.image}
                            alt={meal.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 right-3 flex gap-1.5">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shadow ${
                                meal.is_available
                                  ? 'bg-[#15803D] text-white'
                                  : 'bg-[#B91C1C] text-white'
                              }`}
                            >
                              {meal.is_available ? 'Available' : 'Unavailable'}
                            </span>
                          </div>
                        </div>
                        <div className="p-5 space-y-2">
                          <p className="text-xs font-semibold text-[#B91C1C] uppercase tracking-wider">
                            {meal.category}
                          </p>
                          <h3 className="font-display text-lg font-semibold text-[#1C1917]">
                            {meal.name}
                          </h3>
                          <p className="text-xs text-[#57534E] line-clamp-2">
                            {meal.short_description}
                          </p>
                          <p className="tabular-nums font-display text-lg font-semibold text-[#15803D] pt-1">
                            {meal.price_naira > 0
                              ? formatNaira(meal.price_naira)
                              : 'Contact for Price (Unconfirmed)'}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 border-t border-[#1C1917]/8 flex items-center justify-end gap-2 bg-[#FAF7F2]/50">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMeal(meal);
                            setMealForm({
                              name: meal.name,
                              category: meal.category,
                              shortDescription: meal.short_description,
                              fullDescription: meal.full_description,
                              priceNaira: meal.price_naira,
                              image: meal.image,
                              isAvailable: meal.is_available,
                              isFeatured: meal.is_featured,
                            });
                            setMealModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1C1917]/15 text-xs font-medium text-[#1C1917] hover:bg-[#F3EEE6] cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteMeal(meal.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#B91C1C]/20 text-xs font-medium text-[#B91C1C] hover:bg-[#B91C1C]/8 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= 3. ORDER MANAGEMENT (STAFF + MANAGER) ================= */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                {['all', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'].map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        orderStatusFilter === st
                          ? 'bg-[#5A0B1E] text-white'
                          : 'bg-[#FFFFFF] text-[#57534E] border border-[#1C1917]/10 hover:bg-[#F3EEE6]'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>

              <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#FAF7F2] border-b border-[#1C1917]/10 text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                        <th className="py-3.5 px-4">Order Ref</th>
                        <th className="py-3.5 px-4">Customer Email</th>
                        <th className="py-3.5 px-4">Total</th>
                        <th className="py-3.5 px-4">Payment</th>
                        <th className="py-3.5 px-4">Order Status</th>
                        <th className="py-3.5 px-4">Time</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1C1917]/8">
                      {(orders || []).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-sm text-[#57534E]">
                            No orders found matching this filter.
                          </td>
                        </tr>
                      ) : (
                        (orders || []).map((ord) => (
                          <tr key={ord.reference} className="hover:bg-[#FAF7F2]/60 transition-colors">
                            <td className="py-4 px-4 font-mono font-semibold text-[#1C1917]">
                              {ord.reference}
                            </td>
                            <td className="py-4 px-4 text-[#57534E]">{ord.email}</td>
                            <td className="py-4 px-4 tabular-nums font-semibold text-[#15803D]">
                              {formatNaira(ord.total_naira)}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  ord.payment_status === 'paid'
                                    ? 'bg-[#15803D]/12 text-[#15803D]'
                                    : 'bg-[#D97706]/12 text-[#B45309]'
                                }`}
                              >
                                {ord.payment_status}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <select
                                value={ord.status}
                                onChange={(e) =>
                                  void handleUpdateOrderStatus(ord.reference, e.target.value)
                                }
                                className="text-xs font-semibold bg-[#FAF7F2] border border-[#1C1917]/15 rounded-md px-2 py-1 text-[#1C1917] cursor-pointer"
                              >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="preparing">Preparing</option>
                                <option value="ready">Ready</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="py-4 px-4 text-xs text-[#57534E]">
                              {new Date(ord.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(ord)}
                                className="px-3 py-1.5 rounded-lg bg-[#5A0B1E]/10 text-[#5A0B1E] hover:bg-[#5A0B1E]/18 text-xs font-medium transition-colors cursor-pointer"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 4. CATERING MANAGEMENT (MANAGER ONLY) ================= */}
          {activeTab === 'catering' && isManager && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                    Catering Enquiries ({cateringList.length})
                  </h2>
                  <p className="text-xs text-[#57534E]">
                    Track group orders, UNIBEN department events, and private catering requests.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCateringFormOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#5A0B1E] text-white text-sm font-medium hover:bg-[#731129] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{cateringFormOpen ? 'Close Form' : 'Record Enquiry'}</span>
                </button>
              </div>

              {cateringFormOpen && (
                <form
                  onSubmit={handleCreateCatering}
                  className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-6 space-y-4"
                >
                  <h3 className="font-display text-lg font-semibold text-[#1C1917]">
                    New Catering Request
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <input
                      type="text"
                      required
                      placeholder="Client Name"
                      value={cateringForm.clientName}
                      onChange={(e) =>
                        setCateringForm({ ...cateringForm, clientName: e.target.value })
                      }
                      className="px-3.5 py-2 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Phone / WhatsApp"
                      value={cateringForm.phone}
                      onChange={(e) => setCateringForm({ ...cateringForm, phone: e.target.value })}
                      className="px-3.5 py-2 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={cateringForm.email}
                      onChange={(e) => setCateringForm({ ...cateringForm, email: e.target.value })}
                      className="px-3.5 py-2 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Event Type"
                      value={cateringForm.eventType}
                      onChange={(e) =>
                        setCateringForm({ ...cateringForm, eventType: e.target.value })
                      }
                      className="px-3.5 py-2 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                    />
                    <input
                      type="date"
                      value={cateringForm.eventDate}
                      onChange={(e) =>
                        setCateringForm({ ...cateringForm, eventDate: e.target.value })
                      }
                      className="px-3.5 py-2 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="Guest Count"
                      value={cateringForm.guestCount}
                      onChange={(e) =>
                        setCateringForm({ ...cateringForm, guestCount: Number(e.target.value) })
                      }
                      className="px-3.5 py-2 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Requested Dishes (e.g., 40 packs Jollof Rice & Chicken)"
                    value={cateringForm.requestedDishes}
                    onChange={(e) =>
                      setCateringForm({ ...cateringForm, requestedDishes: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#15803D] text-white text-sm font-semibold cursor-pointer"
                  >
                    Save Catering Enquiry
                  </button>
                </form>
              )}

              <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#FAF7F2] border-b border-[#1C1917]/10 text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                        <th className="py-3.5 px-4">Client</th>
                        <th className="py-3.5 px-4">Event &amp; Guests</th>
                        <th className="py-3.5 px-4">Dishes Requested</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1C1917]/8">
                      {cateringList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-sm text-[#57534E]">
                            No catering enquiries logged yet. Requests submitted on the Contact page
                            appear here automatically.
                          </td>
                        </tr>
                      ) : (
                        cateringList.map((cat) => (
                          <tr key={cat.id} className="hover:bg-[#FAF7F2]/60">
                            <td className="py-4 px-4">
                              <p className="font-semibold text-[#1C1917]">{cat.clientName}</p>
                              <p className="text-xs text-[#57534E] tabular-nums">{cat.phone}</p>
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-sm text-[#1C1917]">{cat.eventType}</p>
                              <p className="text-xs text-[#57534E]">
                                {cat.guestCount} guests · {cat.eventDate || 'Date TBD'}
                              </p>
                            </td>
                            <td className="py-4 px-4 max-w-sm text-xs text-[#57534E]">
                              {cat.requestedDishes || cat.notes}
                            </td>
                            <td className="py-4 px-4">
                              <select
                                value={cat.status}
                                onChange={(e) =>
                                  void handleUpdateCateringStatus(
                                    cat.id,
                                    e.target.value as CateringEnquiry['status']
                                  )
                                }
                                className="text-xs font-semibold bg-[#FAF7F2] border border-[#1C1917]/15 rounded-md px-2 py-1"
                              >
                                <option value="new">New</option>
                                <option value="quoted">Quoted</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => void handleDeleteCatering(cat.id)}
                                className="p-2 rounded-lg text-[#57534E] hover:text-[#B91C1C] cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 5. CUSTOMER MANAGEMENT (MANAGER ONLY) ================= */}
          {activeTab === 'customers' && isManager && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                  Customer Directory ({customers.length})
                </h2>
                <input
                  type="search"
                  placeholder="Search customer by name or email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-[#1C1917]/15 bg-[#FFFFFF] text-sm w-full sm:w-72"
                />
              </div>

              <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#FAF7F2] border-b border-[#1C1917]/10 text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                        <th className="py-3.5 px-4">Customer</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4">Orders Placed</th>
                        <th className="py-3.5 px-4">Total Spent</th>
                        <th className="py-3.5 px-4">Last Order</th>
                        <th className="py-3.5 px-4">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1C1917]/8">
                      {customers
                        .filter((c) => {
                          const q = customerSearch.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            (c.fullName || '').toLowerCase().includes(q) ||
                            c.email.toLowerCase().includes(q)
                          );
                        })
                        .map((c) => (
                          <tr key={c.userId} className="hover:bg-[#FAF7F2]/60 transition-colors">
                            <td className="py-4 px-4 font-semibold text-[#1C1917]">
                              {c.fullName || 'Guest User'}
                            </td>
                            <td className="py-4 px-4 text-[#57534E]">{c.email}</td>
                            <td className="py-4 px-4 tabular-nums font-semibold">{c.orderCount}</td>
                            <td className="py-4 px-4 tabular-nums font-semibold text-[#15803D]">
                              {formatNaira(c.totalSpent)}
                            </td>
                            <td className="py-4 px-4 text-xs text-[#57534E]">
                              {c.lastOrderAt
                                ? new Date(c.lastOrderAt).toLocaleDateString()
                                : 'No orders'}
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-xs uppercase font-semibold text-[#5A0B1E]">
                                {c.role}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 6. STAFF MANAGEMENT (MANAGER ONLY) ================= */}
          {activeTab === 'staff' && isManager && (
            <div className="space-y-8">
              <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-6 space-y-4">
                <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                  Invite Staff or Manager
                </h2>
                <p className="text-xs text-[#57534E]">
                  Staff members can view orders and update preparation status only. Managers receive
                  full access across pricing, website settings, analytics, reports, and team
                  management.
                </p>
                <form onSubmit={handleInviteStaff} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    placeholder="team@yomatkitchen.ng"
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm text-[#1C1917]"
                  />
                  <select
                    value={newInviteRole}
                    onChange={(e) => setNewInviteRole(e.target.value as 'staff' | 'owner')}
                    className="px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm text-[#1C1917]"
                  >
                    <option value="staff">Staff (Orders Only)</option>
                    <option value="owner">Manager (Full Access)</option>
                  </select>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-white text-sm font-medium transition-colors cursor-pointer"
                  >
                    Send Invitation
                  </button>
                </form>
                {inviteError && <p className="text-xs text-[#B91C1C]">{inviteError}</p>}
              </div>

              <div className="space-y-4">
                <h3 className="font-display text-lg font-semibold text-[#1C1917]">
                  Active Team Members
                </h3>
                <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 divide-y divide-[#1C1917]/8">
                  {(staffList || []).map((st) => (
                    <div
                      key={st.id}
                      className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-display text-base font-semibold text-[#1C1917]">
                          {st.full_name || 'Team Member'}
                        </h4>
                        <p className="text-xs text-[#57534E]">{st.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={st.role === 'owner' || st.role === 'manager' ? 'owner' : 'staff'}
                          onChange={(e) =>
                            void handleChangeStaffRole(st.id, e.target.value as 'staff' | 'owner')
                          }
                          className="text-xs font-semibold bg-[#FAF7F2] border border-[#1C1917]/15 rounded-lg px-2.5 py-1.5"
                        >
                          <option value="staff">Staff</option>
                          <option value="owner">Manager</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => void handleRevokeStaff(st.id)}
                          className="text-xs font-medium text-[#B91C1C] hover:underline cursor-pointer"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {(invitations || []).length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-display text-lg font-semibold text-[#1C1917]">
                    Pending Invitations
                  </h3>
                  <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 divide-y divide-[#1C1917]/8">
                    {(invitations || []).map((inv) => (
                      <div
                        key={inv.id}
                        className="p-4 sm:p-5 flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#1C1917]">{inv.email}</p>
                          <p className="text-xs text-[#57534E]">
                            Role: {inv.role === 'owner' ? 'Manager' : 'Staff'} (Pending sign-in)
                          </p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#D97706]/10 text-[#B45309]">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= 7. ANALYTICS (MANAGER ONLY) ================= */}
          {activeTab === 'analytics' && isManager && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    label: 'Total Paid Revenue',
                    value: formatNaira(analytics?.totalPaidRevenue ?? 0),
                  },
                  {
                    label: 'Pending Revenue',
                    value: formatNaira(analytics?.totalPendingRevenue ?? 0),
                  },
                  { label: 'Total Orders', value: analytics?.totalOrders ?? 0 },
                  {
                    label: 'Average Order Value',
                    value: formatNaira(analytics?.averageOrderValue ?? 0),
                  },
                ].map((card, i) => (
                  <div
                    key={i}
                    className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-6 space-y-2"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                      {card.label}
                    </p>
                    <p className="tabular-nums font-display text-3xl font-semibold text-[#15803D]">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= 8. REPORTS (MANAGER ONLY) ================= */}
          {activeTab === 'reports' && isManager && (
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                      Sales &amp; Order Reports
                    </h2>
                    <p className="text-xs text-[#57534E]">
                      Filter paid and pending kitchen orders by date range and export CSV.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const csv =
                        'Reference,Email,TotalNaira,PaymentStatus,Status,CreatedAt\n' +
                        reportRows
                          .map(
                            (r) =>
                              `${r.reference},${r.email},${r.total_naira},${r.payment_status},${r.status},${r.created_at}`
                          )
                          .join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `yomat_kitchen_report_${new Date()
                        .toISOString()
                        .slice(0, 10)}.csv`;
                      a.click();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#5A0B1E] text-white text-xs font-semibold hover:bg-[#731129] cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Filtered CSV</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={reportFilters.startDate}
                      onChange={(e) =>
                        setReportFilters({ ...reportFilters, startDate: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">End Date</label>
                    <input
                      type="date"
                      value={reportFilters.endDate}
                      onChange={(e) =>
                        setReportFilters({ ...reportFilters, endDate: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">
                      Order Status
                    </label>
                    <select
                      value={reportFilters.status}
                      onChange={(e) =>
                        setReportFilters({ ...reportFilters, status: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2] text-xs"
                    >
                      <option value="all">All Statuses</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">
                      Payment Status
                    </label>
                    <select
                      value={reportFilters.paymentStatus}
                      onChange={(e) =>
                        setReportFilters({ ...reportFilters, paymentStatus: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#1C1917]/15 bg-[#FAF7F2] text-xs"
                    >
                      <option value="all">All Payments</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadTabData('reports')}
                    className="px-4 py-2 rounded-lg bg-[#15803D] text-white text-xs font-semibold hover:bg-[#166534] cursor-pointer"
                  >
                    Apply Filters
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-lg bg-[#FAF7F2] border border-[#1C1917]/8">
                    <p className="text-xs text-[#57534E]">Matching Orders</p>
                    <p className="text-2xl font-display font-semibold tabular-nums">
                      {reportSummary.matchingOrders}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-[#FAF7F2] border border-[#1C1917]/8">
                    <p className="text-xs text-[#57534E]">Filtered Paid Revenue</p>
                    <p className="text-2xl font-display font-semibold tabular-nums text-[#15803D]">
                      {formatNaira(reportSummary.filteredPaidRevenue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#FAF7F2] border-b border-[#1C1917]/10 text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                        <th className="py-3.5 px-4">Reference</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4">Total</th>
                        <th className="py-3.5 px-4">Payment</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1C1917]/8">
                      {reportRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-sm text-[#57534E]">
                            No orders match the selected report filters.
                          </td>
                        </tr>
                      ) : (
                        reportRows.map((row) => (
                          <tr key={row.reference}>
                            <td className="py-3.5 px-4 font-mono text-xs font-semibold">
                              {row.reference}
                            </td>
                            <td className="py-3.5 px-4 text-[#57534E]">{row.email}</td>
                            <td className="py-3.5 px-4 tabular-nums font-semibold text-[#15803D]">
                              {formatNaira(row.total_naira)}
                            </td>
                            <td className="py-3.5 px-4 text-xs uppercase font-semibold">
                              {row.payment_status}
                            </td>
                            <td className="py-3.5 px-4 text-xs uppercase">{row.status}</td>
                            <td className="py-3.5 px-4 text-xs text-[#57534E]">
                              {new Date(row.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 9. WEBSITE MANAGEMENT (MANAGER ONLY) ================= */}
          {activeTab === 'website' && isManager && (
            <div className="max-w-3xl bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                  Website Management &amp; Business Profile
                </h2>
                <p className="text-xs text-[#57534E] mt-1">
                  Updates saved here sync directly to the Homepage, Our Menu notice, Footer, and
                  Contact page.
                </p>
              </div>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                      Restaurant Name
                    </label>
                    <input
                      type="text"
                      value={settings.restaurantName}
                      onChange={(e) => setSettings({ ...settings, restaurantName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="inline-flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.isOpen}
                        onChange={(e) => setSettings({ ...settings, isOpen: e.target.checked })}
                        className="w-4 h-4 rounded text-[#15803D]"
                      />
                      <span>Kitchen Currently Open for Service</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                    Restaurant Address
                  </label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                      Phone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                      Opening Hours
                    </label>
                    <input
                      type="text"
                      value={settings.openingHours}
                      onChange={(e) => setSettings({ ...settings, openingHours: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                    Homepage Hero Subtitle
                  </label>
                  <input
                    type="text"
                    value={settings.heroSubtitle}
                    onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                    Homepage Hero Description
                  </label>
                  <textarea
                    rows={2}
                    value={settings.heroDescription}
                    onChange={(e) => setSettings({ ...settings, heroDescription: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                    Welcome Section Heading
                  </label>
                  <input
                    type="text"
                    value={settings.welcomeHeading}
                    onChange={(e) => setSettings({ ...settings, welcomeHeading: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                    Welcome Section Copy
                  </label>
                  <textarea
                    rows={3}
                    value={settings.welcomeBody}
                    onChange={(e) => setSettings({ ...settings, welcomeBody: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                    Our Menu Notice Banner
                  </label>
                  <input
                    type="text"
                    value={settings.menuNotice}
                    onChange={(e) => setSettings({ ...settings, menuNotice: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-lg bg-[#5A0B1E] hover:bg-[#731129] text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Save &amp; Publish Website Content
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= 10. ACTIVITY LOGS (MANAGER ONLY) ================= */}
          {activeTab === 'activity' && isManager && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                  Admin &amp; Security Activity Logs ({activityLogs.length})
                </h2>
                <p className="text-xs text-[#57534E]">
                  Immutable trail of staff &amp; manager actions, price approvals, and denied RBAC
                  attempts.
                </p>
              </div>

              <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#FAF7F2] border-b border-[#1C1917]/10 text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                        <th className="py-3.5 px-4">Timestamp</th>
                        <th className="py-3.5 px-4">Actor Role</th>
                        <th className="py-3.5 px-4">Action &amp; Target</th>
                        <th className="py-3.5 px-4">Outcome</th>
                        <th className="py-3.5 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1C1917]/8">
                      {activityLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-sm text-[#57534E]">
                            No activity events recorded yet.
                          </td>
                        </tr>
                      ) : (
                        activityLogs.map((log, i) => (
                          <tr key={log.id || i}>
                            <td className="py-3.5 px-4 text-xs text-[#57534E] whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-xs font-semibold uppercase text-[#5A0B1E]">
                                {log.actor_role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-[#1C1917]">
                              {log.action} {log.target}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  log.outcome === 'allowed'
                                    ? 'bg-[#15803D]/12 text-[#15803D]'
                                    : 'bg-[#B91C1C]/12 text-[#B91C1C]'
                                }`}
                              >
                                {log.outcome}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-[#57534E]">
                              {log.reason || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 11. CUSTOMER REVIEWS (MANAGER ONLY) ================= */}
          {activeTab === 'reviews' && isManager && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#1C1917]">
                    Customer Reviews &amp; Ratings ({adminReviews.length})
                  </h2>
                  <p className="text-xs text-[#57534E]">
                    Moderate verified-purchase customer feedback and testimonials.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={reviewStatusFilter}
                    onChange={(e) => setReviewStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#1C1917]/20 bg-white text-xs font-medium text-[#1C1917]"
                  >
                    <option value="all">All Reviews</option>
                    <option value="approved">Approved</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#FAF7F2] border-b border-[#1C1917]/10 text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                        <th className="py-3.5 px-4">Customer &amp; Date</th>
                        <th className="py-3.5 px-4">Meal Ordered</th>
                        <th className="py-3.5 px-4">Rating</th>
                        <th className="py-3.5 px-4">Comment</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1C1917]/8">
                      {adminReviews
                        .filter((r) => reviewStatusFilter === 'all' || r.status === reviewStatusFilter)
                        .length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-sm text-[#57534E]">
                            No customer reviews found matching filter.
                          </td>
                        </tr>
                      ) : (
                        adminReviews
                          .filter((r) => reviewStatusFilter === 'all' || r.status === reviewStatusFilter)
                          .map((rev) => (
                            <tr key={rev.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                              <td className="py-3.5 px-4">
                                <p className="font-semibold text-[#1C1917]">{rev.customerName}</p>
                                <p className="text-[11px] text-[#57534E]">{rev.customerEmail}</p>
                                <p className="text-[10px] text-[#57534E] mt-0.5">
                                  {new Date(rev.createdAt).toLocaleDateString()}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 font-medium text-[#5A0B1E]">
                                {rev.mealName}
                                <span className="block text-[10px] text-[#57534E] font-mono">
                                  {rev.orderReference}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1 text-[#E11D48] font-bold">
                                  <Star className="w-4 h-4 fill-current" />
                                  <span>{rev.rating}/5</span>
                                </div>
                                <p className="text-[10px] text-[#57534E] mt-0.5">
                                  Taste: {rev.foodTaste} | Quality: {rev.foodQuality} | Portion: {rev.portionSize}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 max-w-xs text-xs text-[#1C1917]">
                                "{rev.comment}"
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                    rev.status === 'approved'
                                      ? 'bg-[#15803D]/12 text-[#15803D]'
                                      : 'bg-amber-500/12 text-amber-700'
                                  }`}
                                >
                                  {rev.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                                {rev.status !== 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => handleModerateReview(rev.id, 'approved')}
                                    className="px-2.5 py-1 rounded bg-[#15803D]/10 text-[#15803D] hover:bg-[#15803D]/20 font-semibold text-xs cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                {rev.status !== 'hidden' && (
                                  <button
                                    type="button"
                                    onClick={() => handleModerateReview(rev.id, 'hidden')}
                                    className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 font-semibold text-xs cursor-pointer"
                                  >
                                    Hide
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleModerateReview(rev.id, 'deleted')}
                                  className="px-2.5 py-1 rounded bg-[#B91C1C]/10 text-[#B91C1C] hover:bg-[#B91C1C]/20 font-semibold text-xs cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 12. AI BUSINESS INSIGHTS (MANAGER ONLY) ================= */}
          {activeTab === 'ai_insights' && isManager && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#1C1917]">
                    AI Business Insights &amp; Management Intelligence
                  </h2>
                  <p className="text-xs text-[#57534E]">
                    Advanced AI analytics powered by Google Gemini analyzing Yomat Kitchen orders, customer reviews, and sales trends.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={aiPeriod}
                    onChange={(e) => setAiPeriod(e.target.value)}
                    className="px-3.5 py-2 rounded-lg border border-[#1C1917]/20 bg-white text-xs font-semibold text-[#1C1917]"
                  >
                    <option value="daily">Daily Report</option>
                    <option value="weekly">Weekly Report</option>
                    <option value="monthly">Monthly Report</option>
                    <option value="quarterly">Quarterly Report</option>
                    <option value="annual">Annual Report</option>
                  </select>
                  <select
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="px-3.5 py-2 rounded-lg border border-[#1C1917]/20 bg-white text-xs font-semibold text-[#1C1917]"
                  >
                    <option value="complete">Complete Overview</option>
                    <option value="sentiment">Customer Sentiment &amp; Quality</option>
                    <option value="sales">Sales &amp; Revenue Trends</option>
                    <option value="menu">Menu Optimization</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleGenerateAiReport()}
                    disabled={generatingAiReport}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5A0B1E] text-white text-xs font-semibold hover:bg-[#731129] disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{generatingAiReport ? 'Analyzing Data...' : 'Generate AI Report'}</span>
                  </button>
                </div>
              </div>

              {aiReport ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Report Card */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-6 sm:p-8 space-y-6 shadow-sm">
                      <div className="border-b border-[#1C1917]/10 pb-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A0B1E]">
                          Yomat Kitchen Management Report ({aiPeriod} — {aiTopic})
                        </span>
                        <h3 className="font-display text-xl font-semibold text-[#1C1917] mt-1">
                          Executive Summary
                        </h3>
                        <p className="text-sm text-[#57534E] mt-2 leading-relaxed">
                          {aiReport.executiveSummary}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#1C1917]/8 space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5A0B1E]">
                            Business Performance
                          </h4>
                          <p className="text-xs text-[#1C1917] leading-relaxed">
                            {aiReport.businessPerformanceOverview}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#1C1917]/8 space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#15803D]">
                            Customer Satisfaction
                          </h4>
                          <p className="text-xs text-[#1C1917] leading-relaxed">
                            {aiReport.customerSatisfaction}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1C1917]">
                          Sentiment Analysis &amp; Trends
                        </h4>
                        <p className="text-xs text-[#57534E] leading-relaxed bg-[#FAF7F2] p-4 rounded-lg">
                          {aiReport.customerSentimentAnalysis}
                        </p>
                        <p className="text-xs text-[#57534E] leading-relaxed bg-[#FAF7F2] p-4 rounded-lg">
                          {aiReport.salesAndOrderingTrends}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#15803D]">
                            Key Strengths
                          </h4>
                          <ul className="space-y-1.5 text-xs text-[#1C1917]">
                            {aiReport.strengths?.map((str, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-[#15803D] font-bold">✓</span> {str}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#B91C1C]">
                            Areas for Improvement
                          </h4>
                          <ul className="space-y-1.5 text-xs text-[#1C1917]">
                            {aiReport.areasForImprovement?.map((area, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-[#B91C1C] font-bold">•</span> {area}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="border-t border-[#1C1917]/10 pt-6 space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5A0B1E]">
                          Management Action Plan &amp; AI Recommendations
                        </h4>
                        <div className="space-y-2">
                          {aiReport.managementActionPlan?.map((action, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#5A0B1E]/5 text-xs text-[#1C1917]">
                              <span className="font-bold text-[#5A0B1E]">{i + 1}.</span>
                              <span>{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <p className="text-[11px] text-[#57534E] italic pt-2">
                        {aiReport.dataCoverageNote}
                      </p>
                    </div>
                  </div>

                  {/* AI Assistant Chat Box */}
                  <div className="lg:col-span-4 flex flex-col bg-[#FFFFFF] rounded-xl border border-[#1C1917]/10 p-5 shadow-sm h-[600px]">
                    <div className="flex items-center gap-2 pb-3 border-b border-[#1C1917]/10">
                      <div className="w-8 h-8 rounded-lg bg-[#5A0B1E] text-white flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-semibold text-[#1C1917]">
                          AI Business Assistant
                        </h3>
                        <p className="text-[10px] text-[#57534E]">Ask anything about restaurant data</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                      {aiChatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex flex-col ${
                            msg.sender === 'manager' ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div
                            className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed ${
                              msg.sender === 'manager'
                                ? 'bg-[#5A0B1E] text-white rounded-br-none'
                                : 'bg-[#FAF7F2] text-[#1C1917] border border-[#1C1917]/8 rounded-bl-none'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendAiChat} className="pt-3 border-t border-[#1C1917]/10 flex gap-2">
                      <input
                        type="text"
                        value={aiChatInput}
                        onChange={(e) => setAiChatInput(e.target.value)}
                        placeholder="Ask e.g. Which meal has the highest rating?"
                        className="flex-1 px-3 py-2 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-xs text-[#1C1917]"
                      />
                      <button
                        type="submit"
                        disabled={sendingAiChat || !aiChatInput.trim()}
                        className="px-3 py-2 rounded-lg bg-[#5A0B1E] text-white text-xs font-semibold hover:bg-[#731129] disabled:opacity-50 cursor-pointer"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-xl border border-[#1C1917]/10 space-y-4">
                  <Sparkles className="w-12 h-12 text-[#5A0B1E] mx-auto animate-pulse" />
                  <p className="text-sm font-semibold text-[#1C1917]">
                    Click "Generate AI Report" to analyze Yomat Kitchen business metrics and customer reviews.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ================= ORDER DETAILS MODAL ================= */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/15 max-w-lg w-full p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1C1917]/10">
              <div>
                <p className="text-xs font-semibold text-[#B91C1C]">Order Details</p>
                <h3 className="font-display text-xl font-semibold text-[#1C1917]">
                  {selectedOrder.reference}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-[#57534E] hover:text-[#1C1917]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-[#57534E]">
                Customer: <strong className="text-[#1C1917]">{selectedOrder.email}</strong>
              </p>
              <p className="text-[#57534E]">
                Status: <strong className="text-[#15803D] uppercase">{selectedOrder.status}</strong>
              </p>
              <p className="text-[#57534E]">
                Payment:{' '}
                <strong className="text-[#15803D] uppercase">{selectedOrder.payment_status}</strong>
              </p>

              <div className="border-t border-[#1C1917]/10 pt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                  Ordered Items
                </p>
                {selectedOrder.order_items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>
                      {item.quantity} × {item.name}
                    </span>
                    <span className="tabular-nums font-medium">
                      {formatNaira(item.line_total_naira)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#1C1917]/10 pt-3 flex justify-between font-semibold text-base">
                <span>Total Amount</span>
                <span className="tabular-nums text-[#5A0B1E]">
                  {formatNaira(selectedOrder.total_naira)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg border border-[#1C1917]/15 text-sm font-medium text-[#1C1917] hover:bg-[#F3EEE6] transition-colors cursor-pointer"
              >
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-lg bg-[#5A0B1E] text-white text-sm font-medium hover:bg-[#731129] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MEAL CREATE/EDIT MODAL ================= */}
      {mealModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] rounded-xl border border-[#1C1917]/15 max-w-lg w-full p-6 sm:p-8 space-y-5 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#1C1917]/10">
              <h3 className="font-display text-xl font-semibold text-[#1C1917]">
                {editingMeal ? 'Edit Menu Dish' : 'Add New Menu Dish'}
              </h3>
              <button
                type="button"
                onClick={() => setMealModalOpen(false)}
                className="p-1 rounded-lg text-[#57534E]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                  Dish Name
                </label>
                <input
                  type="text"
                  required
                  value={mealForm.name}
                  onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm text-[#1C1917]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                    Category
                  </label>
                  <select
                    value={mealForm.category}
                    onChange={(e) => setMealForm({ ...mealForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm text-[#1C1917]"
                  >
                    {categories.length > 0 ? (
                      categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Main Dishes & Meals">Main Dishes &amp; Meals</option>
                        <option value="Soups & Swallow">Soups &amp; Swallow</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                    Confirmed Price (₦ NGN)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={50}
                    value={mealForm.priceNaira}
                    onChange={(e) =>
                      setMealForm({ ...mealForm, priceNaira: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm text-[#1C1917]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  required
                  value={mealForm.shortDescription}
                  onChange={(e) => setMealForm({ ...mealForm, shortDescription: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-sm text-[#1C1917]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                  Dish Image (Pick Local Asset, Paste URL, or Upload Photo)
                </label>
                <select
                  value={
                    AVAILABLE_DISH_IMAGES.some((i) => i.path === mealForm.image)
                      ? mealForm.image
                      : ''
                  }
                  onChange={(e) => {
                    if (e.target.value) {
                      setMealForm({ ...mealForm, image: e.target.value });
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-xs text-[#1C1917]"
                >
                  <option value="">-- Choose from kitchen dish photography --</option>
                  {AVAILABLE_DISH_IMAGES.map((img) => (
                    <option key={img.path} value={img.path}>
                      {img.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={mealForm.image}
                    onChange={(e) => setMealForm({ ...mealForm, image: e.target.value })}
                    placeholder="https://... or /src/assets/images/..."
                    className="flex-1 px-3.5 py-2 rounded-lg border border-[#1C1917]/20 bg-[#FAF7F2] text-xs text-[#1C1917]"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#5A0B1E]/25 text-xs font-medium text-[#5A0B1E] hover:bg-[#FAF7F2] cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleDishImageFile}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1C1917] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mealForm.isAvailable}
                    onChange={(e) => setMealForm({ ...mealForm, isAvailable: e.target.checked })}
                    className="w-4 h-4 rounded border-[#1C1917]/20 text-[#15803D]"
                  />
                  <span>Available on Menu</span>
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-[#1C1917] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mealForm.isFeatured}
                    onChange={(e) => setMealForm({ ...mealForm, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded border-[#1C1917]/20 text-[#5A0B1E]"
                  />
                  <span>Featured on Homepage</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMealModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#1C1917]/15 text-sm font-medium text-[#1C1917] hover:bg-[#F3EEE6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-[#5A0B1E] text-white text-sm font-medium hover:bg-[#731129] cursor-pointer"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
