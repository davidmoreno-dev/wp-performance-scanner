import { ScanReport } from "@/components/ScanReport";

type ReportPageProps = {
  params: Promise<{ token: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { token } = await params;

  return <ScanReport token={token} />;
}

export async function generateMetadata({ params }: ReportPageProps) {
  const { token } = await params;
  return {
    title: `Scan Report · ${token.substring(0, 8)}... · WP Performance Scanner`,
    description: "WordPress performance scan report",
  };
}
