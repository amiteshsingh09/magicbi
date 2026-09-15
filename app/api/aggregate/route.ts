import { NextRequest, NextResponse } from 'next/server';
import { aggregate, type GroupBy, type Measure } from '@/lib/aggregate';

export function GET(request: NextRequest) {
  const measure = request.nextUrl.searchParams.get('measure') ?? 'revenue'; const groupBy = request.nextUrl.searchParams.get('groupBy') ?? 'region';
  if (!['revenue','orders'].includes(measure) || !['region','category'].includes(groupBy)) return NextResponse.json({ error: 'measure must be revenue or orders; groupBy must be region or category' }, { status: 400 });
  return NextResponse.json(aggregate(measure as Measure, groupBy as GroupBy), { headers: { 'Cache-Control': 'no-store' } });
}
