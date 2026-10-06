import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('loyalty_session_user');
  response.cookies.delete('loyalty_active_business_id');
  return response;
}
