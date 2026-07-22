import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { InfluencersPage } from './pages/InfluencersPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { BannersPage } from './pages/BannersPage';
import { CalendarPage } from './pages/CalendarPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { MarketingTasksPage } from './pages/MarketingTasksPage';
import { LoginPage } from './pages/LoginPage';
import { ShiftSubmissionPage } from './pages/ShiftSubmissionPage';
import { ShiftBoardPage } from './pages/ShiftBoardPage';
import { StoreReviewsPage } from './pages/StoreReviewsPage';
import { NewPerfumesPage } from './pages/NewPerfumesPage';
import { VelourInfluencersPage } from './pages/VelourInfluencersPage';
import { LaBoraInfluencersPage } from './pages/LaBoraInfluencersPage';
import { WarehousePage } from './pages/WarehousePage';
import { PackageDeliveryPage } from './pages/PackageDeliveryPage';
import { PerfumeGeneratorPage } from './pages/PerfumeGeneratorPage';
import { BonusDashboard } from './pages/BonusDashboard';
import { AddBonusPage } from './pages/AddBonusPage';
import { AdminBonusPage } from './pages/AdminBonusPage';
import { LiberoCouponSummary } from './pages/LiberoCouponSummary';
import { LaburaCouponSummary } from './pages/LaburaCouponSummary';
import { VelourCouponSummary } from './pages/VelourCouponSummary';
import { InventoryAnalysisPage } from './pages/InventoryAnalysisPage';
import { PasswordGate } from './components/PasswordGate';

const PublicCouponLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#fbfbfd]" dir="rtl">
    <div className="max-w-7xl mx-auto px-1.5 md:px-8 py-6 md:py-12">
      {children}
    </div>
  </div>
);

const ProtectedRoute = () => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const userRole = localStorage.getItem('userRole');
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Strict Access Control for Store Manager
  if (userRole === 'store_manager') {
    if (location.pathname !== '/store-reviews') {
      return <Navigate to="/store-reviews" replace />;
    }
  }

  // Strict Access Control for Bonus Employee
  if (userRole === 'bonus_employee') {
    if (!location.pathname.startsWith('/bonus-dashboard')) {
      return <Navigate to="/bonus-dashboard" replace />;
    }
  }

  return <Outlet />;
};

// ... (existing imports)

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/public/shifts" element={<ShiftSubmissionPage />} />
        <Route path="/public/warehouse" element={<WarehousePage />} />
        <Route path="/public/delivery" element={<PackageDeliveryPage />} />
        <Route path="/public/perfume-generator" element={<PerfumeGeneratorPage />} />
        
        {/* Public Coupon Reports with Password Protection */}
        <Route path="/public/coupons/libero" element={<PasswordGate><PublicCouponLayout><LiberoCouponSummary /></PublicCouponLayout></PasswordGate>} />
        <Route path="/public/coupons/labura" element={<PasswordGate><PublicCouponLayout><LaburaCouponSummary /></PublicCouponLayout></PasswordGate>} />
        <Route path="/public/coupons/velour" element={<PasswordGate><PublicCouponLayout><VelourCouponSummary /></PublicCouponLayout></PasswordGate>} />
        
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/influencers" replace />} />
            <Route path="influencers" element={<InfluencersPage />} />
            <Route path="velour-influencers" element={<VelourInfluencersPage />} />
            <Route path="la-bora-influencers" element={<LaBoraInfluencersPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="banners" element={<BannersPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="shift-board" element={<ShiftBoardPage />} />
            <Route path="store-reviews" element={<StoreReviewsPage />} />
            <Route path="marketing-tasks" element={<MarketingTasksPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="new-perfumes" element={<NewPerfumesPage />} />
            
            {/* Bonus System Routes */}
            <Route path="bonus-dashboard" element={<BonusDashboard />} />
            <Route path="bonus-dashboard/add" element={<AddBonusPage />} />
            <Route path="admin/bonus-tracking" element={<AdminBonusPage />} />
            <Route path="libero-coupons" element={<LiberoCouponSummary />} />
            <Route path="labura-coupons" element={<LaburaCouponSummary />} />
            <Route path="velour-coupons" element={<VelourCouponSummary />} />
            <Route path="inventory-analysis" element={<InventoryAnalysisPage />} />

          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
