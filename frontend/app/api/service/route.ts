// /pages/api/service.js or /app/api/service/route.js (depending on your Next.js version)
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Resend } from 'resend';

dotenv.config();

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not defined');
}
if (!process.env.SUPABASE_SECRET_KEY) {
  throw new Error('SUPABASE_SECRET_KEY is not defined');
}
if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined');
}

// Initialize Supabase client with additional options
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'x-client-info': 'aginews-frontend'
    }
  }
});

// Create users table if it doesn't exist
async function createUsersTable() {
  try {
    // First check if the table exists
    const { data: tableExists, error: checkError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      // Table doesn't exist, create it
      const { error: createError } = await supabase.rpc('create_table', {
        table_name: 'users',
        table_definition: `
          CREATE TABLE IF NOT EXISTS public.users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
          );
        `
      });

      if (createError) {
        console.error('Error creating table:', createError);
        return false;
      }
      console.log('Users table created successfully');
    } else if (checkError) {
      console.error('Error checking table existence:', checkError);
      return false;
    } else {
      console.log('Users table already exists');
    }
    return true;
  } catch (error) {
    console.error('Error in createUsersTable:', error);
    return false;
  }
}

// Test Supabase connection and table existence
async function testSupabaseConnection() {
  try {
    // First try to create the table
    const tableCreated = await createUsersTable();
    if (!tableCreated) {
      return false;
    }

    // Then test the connection with a simple query
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
}

// Handle POST requests
export async function POST(request: Request) {
  try {
    // Test connection first
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      return NextResponse.json({ 
        error: 'Database connection failed',
        message: 'Unable to connect to the database. Please try again later.'
      }, { status: 503 });
    }

    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('Processing subscription for email:', email);

    // Check if the user already exists
    let { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('Error checking existing user:', userError);
      if (userError.code === 'PGRST116') {
        // No rows found, which is acceptable
        console.log('No existing user found, will create new one');
      } else {
        throw userError;
      }
    }

    // If user doesn't exist, insert them
    let userId;
    if (!existingUser) {
      console.log('Creating new user');
      const { data: newUser, error: insertUserError } = await supabase
        .from('users')
        .insert({ email })
        .select()
        .single();

      if (insertUserError) {
        console.error('Error inserting new user:', insertUserError);
        throw insertUserError;
      }
      userId = newUser.id;
    } else {
      console.log('User already exists');
      userId = existingUser.id;
    }

    console.log('Sending confirmation email');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const data = await resend.emails.send({
      from: 'eric@tryfirecrawl.com',
      to: email,
      subject: 'Hello from AGI News',
      text: 'Congratulations! You have successfully subscribed to AGI News. We will send you a daily email with the latest news in AI starting tomorrow.',
    });

    console.log('Email sent successfully');
    return NextResponse.json({ message: 'Data inserted successfully and email sent!' });
  } catch (error) {
    console.error('Detailed error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message,
        stack: error.stack,
        type: error.name
      }, { status: 500 });
    } else {
      return NextResponse.json({ 
        error: 'An unknown error occurred',
        details: error
      }, { status: 500 });
    }
  }
}
