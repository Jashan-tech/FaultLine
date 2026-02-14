import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const tiles = [
  {
    title: 'Logs',
    href: '/grafana/explore?left=' + encodeURIComponent('{"datasource":"Loki","queries":[{"expr":"{service=\"node-express-example\"}"}]}')
  },
  {
    title: 'Traces',
    href: '/grafana/explore?left=' + encodeURIComponent('{"datasource":"Tempo","queries":[{"query":"service.name=node-express-example"}]}')
  },
  {
    title: 'Metrics',
    href: '/grafana/explore?left=' + encodeURIComponent('{"datasource":"Prometheus","queries":[{"expr":"http_requests_total"}]}')
  }
];

export default function ExplorePage(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Explore</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.title} href={tile.href}>
            <Card className="h-36 transition-colors hover:bg-accent/50">
              <CardHeader>
                <CardTitle>{tile.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Open {tile.title.toLowerCase()} view in Grafana.</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
