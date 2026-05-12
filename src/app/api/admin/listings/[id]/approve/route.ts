import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types";

interface AdminListingMutationData {
  success: boolean;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiResponse<AdminListingMutationData>>(
      { data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json<ApiResponse<AdminListingMutationData>>(
      { data: null, error: "Forbidden" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const { error } = await adminClient
    .from("listings")
    .update({
      rejection_reason: null,
      status: "approved",
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    return NextResponse.json<ApiResponse<AdminListingMutationData>>(
      { data: null, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json<ApiResponse<AdminListingMutationData>>({
    data: { success: true },
    error: null,
  });
}
