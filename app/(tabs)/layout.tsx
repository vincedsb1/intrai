import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import DesktopHeader from "@/components/DesktopHeader";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row w-full h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Sidebar (Desktop Only) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header (Sticky) */}
        <MobileHeader />

        {/* Desktop Header (Sticky) */}
        <DesktopHeader />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
           <div className="max-w-5xl mx-auto p-4 md:p-8 pb-32">
              {children}
           </div>
        </div>

      </main>
    </div>
  );
}