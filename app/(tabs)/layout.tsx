import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import DesktopHeader from "@/components/DesktopHeader";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row w-full h-screen overflow-hidden bg-[#F1F5F9]">
      
      {/* Sidebar (Desktop Only) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header (Sticky) */}
        <MobileHeader />

        {/* Desktop Header (Sticky) */}
        <DesktopHeader />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth bg-[#F1F5F9]">
           {children}
        </div>

      </main>
    </div>
  );
}