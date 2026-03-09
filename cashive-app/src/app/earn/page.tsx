import AppLayout from "@/components/AppLayout";
import FeaturedTasks from "@/components/FeaturedTasks";
import WallSections from "@/components/WallSections";
import LiveTicker from "@/components/LiveTicker";

export default function EarnPage() {
  return (
    <AppLayout>
      {/* Live activity ticker */}
      <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 mb-6">
        <LiveTicker />
      </div>

      {/* Featured tasks carousel */}
      <FeaturedTasks />

      {/* Wall sections */}
      <WallSections />
    </AppLayout>
  );
}
