const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env variables from .env.local in the parent folder
const actualEnvPath = path.join(__dirname, '..', '.env.local');

console.log('Loading env variables from:', actualEnvPath);
if (!fs.existsSync(actualEnvPath)) {
  console.error("Env file not found at " + actualEnvPath);
  process.exit(1);
}

const envContent = fs.readFileSync(actualEnvPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or Service Role Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function clearDates() {
  console.log('Connecting to Supabase to clear all photo dates...');
  
  // Update all photos in 'album_photos' table where photo_date is not null
  const { data, error } = await supabase
    .from('album_photos')
    .update({ photo_date: null })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // update all matching items
    
  if (error) {
    console.error('Error clearing dates in DB:', error.message);
  } else {
    console.log('Successfully cleared all dates from the album_photos database table!');
  }
}

clearDates();
