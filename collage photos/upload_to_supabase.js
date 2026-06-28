const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load env variables from .env.local in the parent folder
const actualEnvPath = path.join(__dirname, '..', '.env.local');

console.log('Loading env variables from:', actualEnvPath);
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

const processedDir = path.join(__dirname, 'final_instax_prints');

// Load selected photos dynamically from selected_moments.json
const selectionsPath = path.join(__dirname, 'selected_moments.json');
let selectedPhotos = [];

if (fs.existsSync(selectionsPath)) {
  try {
    const rawData = fs.readFileSync(selectionsPath, 'utf8');
    const allSelections = JSON.parse(rawData);
    selectedPhotos = allSelections
      .filter(item => item.selected)
      .map(item => ({
        filename: `instax_${item.filename}`,
        caption: item.caption || 'Our Memory 💖',
        db_date: item.custom_date || new Date().toISOString().split('T')[0]
      }));
    console.log(`Loaded ${selectedPhotos.length} approved photos for upload.`);
  } catch (err) {
    console.error('Error reading selected_moments.json:', err.message);
    process.exit(1);
  }
} else {
  console.error('Error: selected_moments.json does not exist. Please use the selector tool first!');
  process.exit(1);
}

async function uploadAndInsert() {
  console.log('Starting uploads to Supabase...');
  
  for (const item of selectedPhotos) {
    const filePath = path.join(processedDir, item.filename);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping: ${item.filename} (file does not exist)`);
      continue;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    const bucketFileName = `${Date.now()}_${item.filename}`;
    
    console.log(`Uploading ${item.filename} to storage bucket 'album-photos'...`);
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('album-photos')
      .upload(bucketFileName, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });
      
    if (uploadError) {
      console.error(`Upload error for ${item.filename}:`, uploadError.message);
      continue;
    }
    
    const { data: { publicUrl } } = supabase
      .storage
      .from('album-photos')
      .getPublicUrl(bucketFileName);
      
    console.log(`Uploaded successfully. Public URL: ${publicUrl}`);
    console.log(`Inserting DB row for: ${item.caption}...`);
    
    const { error: dbError } = await supabase
      .from('album_photos')
      .insert([
        {
          image_url: publicUrl,
          caption: item.caption,
          photo_date: null,
          category: 'monthly'
        }
      ]);
      
    if (dbError) {
      console.error(`DB Insert error for ${item.filename}:`, dbError.message);
    } else {
      console.log(`DB Row inserted successfully!`);
    }
    console.log('-----------------------------------');
  }
  
  console.log('All uploads finished!');
}

uploadAndInsert();
