/** bare flex shell for `/signin` and `/signup` — no sidebar/header, unlike `(app)`'s `AppLayout` */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-1">{children}</div>;
}
