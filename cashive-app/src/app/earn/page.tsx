import AppLayout from "@/components/AppLayout";
import FeaturedTasks from "@/components/FeaturedTasks";
import WallSections from "@/components/WallSections";

export default function EarnPage() {
  return (
    <AppLayout>
      {/* Featured tasks carousel */}
      <FeaturedTasks />

      {/* Wall sections */}
      <WallSections />
    </AppLayout>
  );
}
