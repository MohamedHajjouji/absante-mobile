import { supabase } from '@/lib/supabase';

const PROFESSION_SLUG_MAP: Record<string, string> = {
  medecin_cabinet: 'medecin', pharmacie: 'pharmacien', clinique: 'clinique',
  home_doctor: 'medecin-a-domicile', medical_supplies: 'fournitures-medicales', nurse: 'infirmier',
};

export interface OnboardingData {
  profession: string;
  claimedProviderId?: string | null;
  personalInfo: { firstName: string; lastName: string; phone: string; whatsapp: string; gender: string; languages: string[]; biography: string; yearsOfExperience: number; licenseNumber: string; avatarUrl: string; };
  organizationInfo: { name: string; logoUrl: string; description: string; phone: string; whatsapp: string; website: string; };
  address: { region: string | null; city: string; streetAddress: string; postalCode: string | null; };
  facility: { name: string | null; phone: string | null; parkingAvailable: boolean; wheelchairAccessible: boolean; emergencyServices: boolean; };
  services: Array<{ name: string; description: string | null; serviceType: string; bookingMode: string; durationMinutes: number; price: number; }>;
  workingHours: Array<{ weekday: string; startTime: string; endTime: string; }>;
}

export async function submitOnboarding(data: OnboardingData) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { success: false, error: 'Not authenticated' };
  const userId = user.id;

  // 2. Ensure the profiles row exists, then update it with personal info
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      first_name: data.personalInfo.firstName,
      last_name: data.personalInfo.lastName,
      phone: data.personalInfo.phone,
      avatar_url: data.personalInfo.avatarUrl || null,
      gender: data.personalInfo.gender || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profileUpdateError) {
    const { error: profileInsertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: user.email ?? '',
        first_name: data.personalInfo.firstName,
        last_name: data.personalInfo.lastName,
        phone: data.personalInfo.phone,
        avatar_url: data.personalInfo.avatarUrl || null,
        gender: data.personalInfo.gender || null,
      });
    if (profileInsertError) {
      return { success: false, error: "Impossible de créer votre profil." };
    }
  }

  // 3. Look up the profession by slug
  const professionSlug = PROFESSION_SLUG_MAP[data.profession] ?? data.profession;
  const { data: profession } = await supabase
    .from('professions')
    .select('id')
    .eq('slug', professionSlug)
    .single();

  let professionId: string | null = profession?.id ?? null;
  if (!professionId) {
    const { data: newProfession } = await supabase
      .from('professions')
      .insert({ slug: professionSlug, name_fr: data.profession.replace(/_/g, ' ') })
      .select('id')
      .single();
    professionId = newProfession?.id ?? null;
  }

  // 4. Provider record: claim mode vs new-add mode.
  // - Claim mode: reuse the unclaimed directory row, update it WITHOUT setting
  //   profile_id (stays unregistered until admin approves), then file a
  //   profile_claims request.
  // - New mode: update the owned row if one already exists (profile_id unique),
  //   else insert.
  let providerId: string;
  let isClaimMode = !!data.claimedProviderId;
  const claimTargetId = data.claimedProviderId ?? null;
  let hasOwnedLinks = false;

  if (isClaimMode && claimTargetId) {
    const { data: dirProvider } = await supabase
      .from('providers')
      .select('id, profile_id')
      .eq('id', claimTargetId)
      .maybeSingle();

    if (!dirProvider) {
      return { success: false, error: 'Profil annuaire introuvable' };
    }
    if ((dirProvider as any).profile_id && (dirProvider as any).profile_id !== userId) {
      return { success: false, error: 'Ce profil a déjà été revendiqué' };
    }

    if ((dirProvider as any).profile_id === userId) {
      // Already linked (claim previously approved) — update in place.
      const { error: updateError } = await supabase
        .from('providers')
        .update({
          profession_id: professionId,
          biography: data.personalInfo.biography || null,
          years_of_experience: data.personalInfo.yearsOfExperience,
          license_number: data.personalInfo.licenseNumber || null,
          gender: data.personalInfo.gender || null,
          accepts_new_patients: true,
          emergency_available: data.facility.emergencyServices,
          same_day_appointments: false,
          active: true,
          onboarding_completed: true,
          profile_completion_pct: 100,
        })
        .eq('id', claimTargetId);
      if (updateError) return { success: false, error: updateError.message };
      providerId = claimTargetId;
      isClaimMode = false;
    } else {
      const { error: claimUpdateError } = await supabase
        .from('providers')
        .update({
          profession_id: professionId,
          biography: data.personalInfo.biography || null,
          years_of_experience: data.personalInfo.yearsOfExperience,
          license_number: data.personalInfo.licenseNumber || null,
          gender: data.personalInfo.gender || null,
          accepts_new_patients: true,
          emergency_available: data.facility.emergencyServices,
          same_day_appointments: false,
          active: true,
          onboarding_completed: false,
          profile_completion_pct: 100,
        })
        .eq('id', claimTargetId);
      if (claimUpdateError) return { success: false, error: claimUpdateError.message };
      providerId = claimTargetId;

      const { data: existingClaim } = await supabase
        .from('profile_claims')
        .select('id, status')
        .eq('provider_id', claimTargetId)
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!existingClaim || (existingClaim as any).status !== 'pending') {
        const { error: claimError } = await supabase.from('profile_claims').insert({
          provider_id: claimTargetId,
          profile_id: userId,
          license_input: data.personalInfo.licenseNumber?.trim() || null,
          phone_input: data.personalInfo.phone?.trim() || null,
          status: 'pending',
        });
        if (claimError) console.error('Failed to create claim request:', claimError.message);
      }
    }
  } else {
  const { data: existingProvider } = await supabase
    .from('providers')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();

  if (existingProvider) {
    hasOwnedLinks = true;
    const { error: updateError } = await supabase
      .from('providers')
      .update({
        profession_id: professionId,
        biography: data.personalInfo.biography || null,
        years_of_experience: data.personalInfo.yearsOfExperience,
        license_number: data.personalInfo.licenseNumber,
        gender: data.personalInfo.gender || null,
        accepts_new_patients: true,
        emergency_available: data.facility.emergencyServices,
        same_day_appointments: false,
        active: true,
        onboarding_completed: true,
        profile_completion_pct: 100,
      })
      .eq('id', (existingProvider as any).id);
    if (updateError) return { success: false, error: updateError.message };
    providerId = (existingProvider as any).id;
  } else {
  // 4. Insert the provider record
  const { data: provider, error: profError } = await supabase
    .from('providers')
    .insert({
      profile_id: userId,
      profession_id: professionId,
      biography: data.personalInfo.biography || null,
      years_of_experience: data.personalInfo.yearsOfExperience,
      license_number: data.personalInfo.licenseNumber,
      gender: data.personalInfo.gender || null,
      accepts_new_patients: true,
      emergency_available: data.facility.emergencyServices,
      same_day_appointments: false,
      verified_status: 'pending',
      active: true,
      onboarding_completed: true,
      profile_completion_pct: 100,
    })
    .select('id')
    .single();

  if (profError || !provider) {
    return { success: false, error: profError?.message ?? 'Failed to create provider profile' };
  }

  providerId = provider.id;
  }
  }

  // 4b. Owned / claimed rows may already own seeded pieces — reuse them.
  let claimedOrgId: string | null = null;
  let claimedFacilityId: string | null = null;
  let claimedHasServices = false;
  if (isClaimMode || hasOwnedLinks) {
    const [{ data: orgLinks }, { data: facLinks }, { data: svcRows }] = await Promise.all([
      supabase.from('provider_organizations').select('organization_id').eq('provider_id', providerId).limit(1),
      supabase.from('provider_facilities').select('facility_id').eq('provider_id', providerId).limit(1),
      supabase.from('provider_services').select('id').eq('provider_id', providerId).limit(1),
    ]);
    claimedOrgId = (orgLinks as any[])?.[0]?.organization_id ?? null;
    claimedFacilityId = (facLinks as any[])?.[0]?.facility_id ?? null;
    claimedHasServices = ((svcRows as any[]) ?? []).length > 0;
  }

  // 5. Create organization (claimed profiles keep their seeded org)
  let organizationId: string | null = claimedOrgId;
  if (data.organizationInfo.name && !claimedOrgId) {
    const slug = data.organizationInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: data.organizationInfo.name,
        slug: slug || undefined,
        logo_url: data.organizationInfo.logoUrl || null,
        description: data.organizationInfo.description || null,
        phone: data.organizationInfo.phone || null,
        whatsapp: data.organizationInfo.whatsapp || null,
        website: data.organizationInfo.website || null,
        verified: false,
        active: true,
      })
      .select('id')
      .single();

    if (!orgError) {
      organizationId = org.id;
      await supabase.from('provider_organizations').insert({
        provider_id: providerId, organization_id: organizationId, primary_organization: true,
      });
    }
  }

  // 6. Create address
  let addressId: string | null = null;
  if (data.address.city && data.address.streetAddress) {
    const { data: addr, error: addrError } = await supabase
      .from('addresses')
      .insert({
        country: 'Morocco', region: data.address.region || null,
        city: data.address.city, postal_code: data.address.postalCode || null,
        street_address: data.address.streetAddress,
      })
      .select('id').single();
    if (!addrError) addressId = addr.id;
  }

  // 7. Create facility (claimed profiles keep their seeded cabinet)
  let facilityId: string | null = claimedFacilityId;
  const facilityName = data.facility.name || data.organizationInfo.name;
  if (facilityName && organizationId && !claimedFacilityId) {
    const { data: facility, error: facError } = await supabase
      .from('facilities')
      .insert({
        organization_id: organizationId, address_id: addressId, name: facilityName,
        phone: data.facility.phone || data.organizationInfo.phone || null,
        whatsapp: data.organizationInfo.whatsapp || null,
        parking_available: data.facility.parkingAvailable,
        wheelchair_accessible: data.facility.wheelchairAccessible,
        emergency_services: data.facility.emergencyServices, active: true,
      })
      .select('id').single();
    if (!facError) {
      facilityId = facility.id;
      await supabase.from('provider_facilities').insert({
        provider_id: providerId, facility_id: facilityId, primary_facility: true,
      });
    }
  }

  // 8. Insert provider services (claimed profiles keep seeded services
  // when they already exist)
  // booking_mode_enum or the insert fails)
  if (data.services.length > 0 && !claimedHasServices) {
    const servicesPayload = data.services.map((svc) => ({
      provider_id: providerId, name: svc.name, description: svc.description || null,
      service_type: svc.serviceType, booking_mode: svc.bookingMode,
      duration_minutes: svc.durationMinutes, buffer_after_minutes: 0,
      price: svc.price, currency: 'MAD', active: true,
    }));
    const { error: svcError } = await supabase.from('provider_services').insert(servicesPayload);
    if (svcError) return { success: false, error: `Services: ${svcError.message}` };
  }

  // 9. Create default calendar + working hours
  const { data: calendar, error: calError } = await supabase
    .from('provider_calendars')
    .insert({
      provider_id: providerId, facility_id: facilityId,
      name: 'Cabinet', description: 'Calendrier principal',
      timezone: 'Africa/Casablanca', slot_interval_minutes: 30, active: true,
    })
    .select('id').single();

  if (!calError && calendar && data.workingHours.length > 0) {
    const hoursPayload = data.workingHours.map((wh) => ({
      calendar_id: calendar.id, weekday: wh.weekday,
      start_time: wh.startTime, end_time: wh.endTime,
    }));
    await supabase.from('calendar_working_hours').insert(hoursPayload);
  }

  // 11. Create provider_verifications record
  await supabase.from('provider_verifications').insert({ provider_id: providerId, status: 'pending' });

  // 12. Link languages
  if (data.personalInfo.languages.length > 0) {
    for (const lang of data.personalInfo.languages) {
      const { data: langRecord } = await supabase
        .from('languages')
        .select('id')
        .or(`code.eq.${lang},name_fr.eq.${lang},name_en.eq.${lang}`)
        .single();
      if (langRecord) {
        await supabase.from('provider_languages').insert({ provider_id: providerId, language_id: langRecord.id });
      }
    }
  }

  return { success: true, providerId };
}

export async function saveVerificationDocument(providerId: string, documentType: string, fileUrl: string, fileName?: string | null, fileSize?: number | null) {
  const { error } = await supabase.from('provider_verification_documents').insert({
    provider_id: providerId, document_type: documentType,
    file_url: fileUrl, file_name: fileName ?? null, file_size: fileSize ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
