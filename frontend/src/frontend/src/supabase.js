
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ckvngezygpczgwomwrrh.supabase.co";
const supabasePublishableKey = "sb_publishable_VGhVDNCghryOuxKw_9Hgwg_iSPT87ev";

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);
