import PagePlaceholder from '../../components/common/PagePlaceholder';

export default function AdminStaffPage() {
  return (
    <PagePlaceholder
      title="Nhân viên"
      ucs={["UC-30.1 View Staff","UC-30.2 Add Staff","UC-30.3 Update Staff","UC-30.4 Lock Staff Account","UC-30.5 Unlock Staff Account","UC-30.6 View Staff Activity History"]}
    />
  );
}
