import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, password, host_id } = body || {};

    if (!name || !email || !password || !host_id) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // Prefer new secret key; fallback to legacy service_role for compatibility
    const secretKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !secretKey) {
      return new NextResponse('Missing SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY', { status: 500 });
    }

    const admin = createClient(supabaseUrl, secretKey);

    // Ensure host has a profile (FK on cleaners.host_id)
    const { data: existingHost } = await admin
      .from('profiles')
      .select('id')
      .eq('id', host_id)
      .maybeSingle();
    if (!existingHost) {
      const hostUserRes = await admin.auth.admin.getUserById(host_id);
      const hostEmail =
        hostUserRes.data?.user?.email || 'host@example.com';
      const hostName =
        (hostUserRes.data?.user?.user_metadata as any)?.full_name ||
        hostEmail.split('@')[0] ||
        'Host';
      const { error: hostProfileErr } = await admin
        .from('profiles')
        .insert({ id: host_id, email: hostEmail, full_name: hostName, role: 'host' });
      if (hostProfileErr) {
        return new NextResponse(hostProfileErr.message, { status: 500 });
      }
    }

    // Try to reuse existing profile by email first (idempotent)
    let userId: string | null = null;
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile?.id) {
      userId = existingProfile.id;
      // ensure role is cleaner
      if (existingProfile.role !== 'cleaner') {
        await admin.from('profiles').update({ role: 'cleaner' }).eq('id', userId);
      }
    } else {
      // Create auth user
      const { data: userRes, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, role: 'cleaner' },
      });
      if (createErr || !userRes?.user) {
        return new NextResponse(createErr?.message || 'Failed to create user', { status: 500 });
      }
      userId = userRes.user.id;

      // Create profile
      const { error: profileErr } = await admin
        .from('profiles')
        .insert({ id: userId, email, full_name: name, role: 'cleaner' });
      if (profileErr) {
        return new NextResponse(profileErr.message, { status: 500 });
      }
    }

    // Create cleaner row
    const { data: existingCleaner } = await admin
      .from('cleaners')
      .select('id')
      .eq('host_id', host_id)
      .eq('cleaner_profile_id', userId as string)
      .maybeSingle();
    let cleanerErr = null as any;
    if (!existingCleaner) {
      const insertRes = await admin.from('cleaners').insert({
        host_id,
        cleaner_profile_id: userId as string,
        name,
        email,
        phone: phone || null,
      });
      cleanerErr = insertRes.error;
    }
    if (cleanerErr) {
      return new NextResponse(cleanerErr.message, { status: 500 });
    }

    return NextResponse.json({ id: userId });
  } catch (e: any) {
    return new NextResponse(e.message || 'Unknown error', { status: 500 });
  }
}


