import RentalBadge from '../RentalBadge';

export default function RentalBadgeExample() {
  return (
    <div className="p-6 bg-background flex flex-wrap gap-3">
      <RentalBadge daysRemaining={30} />
      <RentalBadge daysRemaining={7} />
      <RentalBadge daysRemaining={1} />
      <RentalBadge daysRemaining={0} isExpired />
    </div>
  );
}
