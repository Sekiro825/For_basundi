const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Custom list of files requested by the user
const userRequestedFiles = [
  "final_instax_Snapchat-922464268.jpg",
  "final_instax_Snapchat-1500244527.jpg",
  "instax_IMG-20260614-WA0001.jpg",
  "instax_IMG_20260607_182300_917.jpg",
  "instax_IMG-20260614-WA0002.jpg",
  "instax_IMG-20260614-WA0009.jpg",
  "instax_Screenshot_2026-05-28-09-58-56-84_1c337646f29875672b5a61192b9010f9.jpg",
  "instax_Screenshot_2026-06-02-11-08-15-99_1c337646f29875672b5a61192b9010f9.jpg",
  "instax_Screenshot_2026-06-13-18-12-49-54_1c337646f29875672b5a61192b9010f9.jpg",
  "instax_Screenshot_2026-06-16-09-30-40-72_1c337646f29875672b5a61192b9010f9.jpg",
  "instax_Screenshot_2026-06-16-15-05-54-59_1c337646f29875672b5a61192b9010f9.jpg",
  "instax_Screenshot_2026-06-17-19-20-51-67_1c337646f29875672b5a61192b9010f9.jpg",
  "instax_Screenshot_2026-06-27-13-50-40-63_1c337646f29875672b5a61192b9010f9.jpg",
  "instax_Screenshot_2026-06-27-13-51-56-15_1c337646f29875672b5a61192b9010f9.jpg",
  "instax_Screenshot_2026-06-27-13-53-26-49_1c337646f29875672b5a61192b9010f9.jpg"
];

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

const processedDir = path.join(__dirname, 'final_instax_prints');
const selectionsPath = path.join(__dirname, 'selected_moments.json');

// Load selected moments metadata
let momentsMap = {};
if (fs.existsSync(selectionsPath)) {
  try {
    const rawData = fs.readFileSync(selectionsPath, 'utf8');
    const allSelections = JSON.parse(rawData);
    allSelections.forEach(item => {
      momentsMap[item.filename] = item;
    });
  } catch (err) {
    console.error('Error reading selected_moments.json:', err.message);
    process.exit(1);
  }
} else {
  console.error('Error: selected_moments.json does not exist.');
  process.exit(1);
}

// Function to extract base filename (e.g. "Snapchat-922464268.jpg")
function getBaseFilename(fullname) {
  const cleanName = path.basename(fullname);
  if (cleanName.startsWith("final_instax_")) {
    return cleanName.replace("final_instax_", "");
  }
  if (cleanName.startsWith("instax_")) {
    return cleanName.replace("instax_", "");
  }
  return cleanName;
}

async function uploadAndInsert() {
  console.log(`Starting custom uploads for ${userRequestedFiles.length} files...`);
  
  for (const requestedFile of userRequestedFiles) {
    const baseName = getBaseFilename(requestedFile);
    // We always use the newly generated version (which starts with instax_ and has no dates!)
    const targetFilename = `instax_${baseName}`;
    const filePath = path.join(processedDir, targetFilename);
    
    if (!fs.existsSync(filePath)) {
      console.error(`Skipping requested file: ${requestedFile} (mapped to ${targetFilename}, but it does not exist at ${filePath})`);
      continue;
    }
    
    // Retrieve metadata
    const metadata = momentsMap[baseName] || {};
    const caption = metadata.caption || 'Our Memory 💖';
    const dbDate = metadata.custom_date || new Date().toISOString().split('T')[0];
    
    const fileBuffer = fs.readFileSync(filePath);
    // Generate unique name in bucket to prevent collisions
    const bucketFileName = `${Date.now()}_${targetFilename}`;
    
    console.log(`Uploading ${targetFilename} as ${bucketFileName} (Caption: "${caption}", Date: ${dbDate})...`);
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('album-photos')
      .upload(bucketFileName, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });
      
    if (uploadError) {
      console.error(`Upload error for ${targetFilename}:`, uploadError.message);
      continue;
    }
    
    const { data: { publicUrl } } = supabase
      .storage
      .from('album-photos')
      .getPublicUrl(bucketFileName);
      
    console.log(`Uploaded successfully. Public URL: ${publicUrl}`);
    console.log(`Inserting DB row...`);
    
    const { error: dbError } = await supabase
      .from('album_photos')
      .insert([
        {
          image_url: publicUrl,
          caption: caption,
          photo_date: null,
          category: 'monthly'
        }
      ]);
      
    if (dbError) {
      console.error(`DB Insert error for ${targetFilename}:`, dbError.message);
    } else {
      console.log(`DB Row inserted successfully!`);
    }
    console.log('-----------------------------------');
  }
  
  console.log('Custom uploads finished successfully!');
}

uploadAndInsert();
