import { Client, Collection, ActivityType } from 'discord.js'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v10'
import { readdirSync } from 'fs'
import mongoose from'mongoose'
mongoose.connect('mongodb+srv://eyurisun:5TPwcApwW5NIuftH@cluster0.mhwlnn7.mongodb.net/', {})
const commands = []
const token = "MTM3ODM2NDYyMjUwMjg4NzQ1NA.GRIIP7.DkTdiBd7iLD0VXzu2rM_arivjzGYQtAS63Ok0A"
const clientId = "1378364622502887454"
const bot = new Client({
    intents: 53608447
})

bot.commands = new Collection()
const file = readdirSync('./cmd').filter(f => f.endsWith('.js'))
for(const files of file){
    const command = await import(`./cmd/${files}`)
    commands.push(command.default.data.toJSON())
    bot.commands.set(command.default.data.name, command.default)
}

import roleauto from'./mongodb/main.js'
bot.on('guildMemberAdd', async(member) => {
 const database = await roleauto.findOne({serverId: member.guild.id})
   if(!database) return;
 
 const role = member.guild.roles.cache.get(database.Roleid)
 const botpos = await member.guild.members.fetch(bot.user.id)
  if(!role) return;
   if(role.position >= botpos.roles.highest.position) return;
    await member.roles.add(role)
});

(async() => {
    const rest = new REST({version: "9"}).setToken(token)
    try{
        await rest.put(
            Routes.applicationCommands(clientId),{
                body: commands
            }
        )
    }catch(err){
        console.log("I want to wash my ass", err)
    }
})()

bot.login(token)

bot.on('ready', async() => {
    bot.user?.setPresence({activities: [{name: "Hello kitty", type: ActivityType.Watching}], status: "dnd"})
    console.log("i love goth girls")
})



bot.on('interactionCreate', async(int) => {
    if(!int.isCommand()) return;
    const command = bot.commands.get(int.commandName)
    if(!command) return;
    try{
        await command.execute(int, bot)
    }catch(err){
        console.log("I want to wash my ass", err)
    }
})

import roleactive from './mongodb/usertiming.js';
import cron from 'node-cron';

const VOICE_TIERS = [
  {
    name: "@Beginner",
    min: 40 * 1000,   
    max: 6 * 60 * 60 * 1000,
    roleId: "1378355398561759254"               
  },
  {
    name: "@Studious",
    min: 6 * 60 * 60 * 1000,
    max: 12 * 60 * 60 * 1000,
    roleId: "1378355398561759255"
  },
  {
    name: "@Bookworm",
    min: 12 * 60 * 60 * 1000,
    max: 24 * 60 * 60 * 1000,
    roleId: "1378355398561759256"
  },
  {
    name: "@Academic",
    min: 24 * 60 * 60 * 1000,
    max: 48 * 60 * 60 * 1000,
    roleId: "1378355398561759257"
  },
  {
    name: "@Scholar",
    min: 48 * 60 * 60 * 1000,
    max: 100 * 60 * 60 * 1000,
    roleId: "1378355398561759258"
  },
  {
    name: "@Erudite",
    min: 100 * 60 * 60 * 1000,
    max: 200 * 60 * 60 * 1000,
    roleId: "1378355398561759259"
  },
  {
    name: "@Study legend",
    min: 200 * 60 * 60 * 1000,
    max: Infinity,
    roleId: "1378355398561759260"
  }
];

// Track active users with their join times
const activeUsers = new Map();

// Track users who are muted/deafened to exclude their time
const mutedUsers = new Set();

// Configuration
const CONFIG = {
  UPDATE_INTERVAL: 30000, // 30 seconds
  MIN_SESSION_TIME: 5000, // 5 seconds minimum to count
  EXCLUDE_MUTED: true, // Don't count time when muted
  EXCLUDE_DEAFENED: true // Don't count time when deafened
};

/**
 * Get the appropriate tier for a user based on their total time
 */
function getTierForTime(totalTime) {
  return VOICE_TIERS.find(tier => 
    totalTime >= tier.min && 
    (tier.max === Infinity || totalTime < tier.max)
  ) || null;
}

/**
 * Check if user should be tracked (not muted/deafened if configured)
 */
function shouldTrackUser(voiceState) {
  if (CONFIG.EXCLUDE_MUTED && voiceState.mute) {
    return false;
  }
  if (CONFIG.EXCLUDE_DEAFENED && voiceState.deaf) {
    return false;
  }
  return true;
}

/**
 * Create or get user record from database
 */
async function getOrCreateUserRecord(serverId, userId) {
  try {
    let userRecord = await roleactive.findOne({
      serverId: serverId,
      userId: userId
    });

    if (!userRecord) {
      userRecord = new roleactive({
        serverId: serverId,
        userId: userId,
        timeTotal: 0,
        roleId: null,
        lastUpdated: new Date(),
        sessionsCount: 0
      });
      await userRecord.save();
      console.log(`[DATABASE] Created new record for user ${userId} in server ${serverId}`);
    }

    return userRecord;
  } catch (error) {
    console.error(`[ERROR] Failed to get/create user record for ${userId}:`, error.message);
    return null;
  }
}

/**
 * Update user's total time and save to database
 */
async function updateUserTime(serverId, userId, sessionTime) {
  if (sessionTime < CONFIG.MIN_SESSION_TIME) {
    console.log(`[SKIP] Session time ${sessionTime}ms too short for user ${userId}, minimum is ${CONFIG.MIN_SESSION_TIME}ms`);
    return false;
  }

  try {
    const userRecord = await getOrCreateUserRecord(serverId, userId);
    if (!userRecord) return false;

    const oldTime = userRecord.timeTotal;
    userRecord.timeTotal += sessionTime;
    userRecord.lastUpdated = new Date();
    userRecord.sessionsCount = (userRecord.sessionsCount || 0) + 1;

    await userRecord.save();
    
    console.log(`[UPDATE] User ${userId}: ${oldTime}ms + ${sessionTime}ms = ${userRecord.timeTotal}ms (Session #${userRecord.sessionsCount})`);
    
    // Check if user needs role update after time change
    await checkUserRole(serverId, userId, userRecord);
    
    return true;
  } catch (error) {
    console.error(`[ERROR] Failed to update time for user ${userId}:`, error.message);
    return false;
  }
}

/**
 * Check and update a single user's role based on their time
 */
async function checkUserRole(serverId, userId, userRecord = null) {
  try {
    if (!userRecord) {
      userRecord = await roleactive.findOne({ serverId, userId });
      if (!userRecord) return false;
    }

    const correctTier = getTierForTime(userRecord.timeTotal);
    
    if (!correctTier) {
      console.log(`[ROLE] User ${userId} doesn't qualify for any tier yet (${userRecord.timeTotal}ms < ${VOICE_TIERS[0].min}ms)`);
      return false;
    }

    // Check if user already has correct role
    if (userRecord.roleId === correctTier.roleId) {
      console.log(`[ROLE] User ${userId} already has correct role ${correctTier.name}`);
      return true;
    }

    const guild = bot.guilds.cache.get(serverId);
    if (!guild) {
      console.log(`[ERROR] Guild ${serverId} not found`);
      return false;
    }

    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (fetchError) {
      console.log(`[ERROR] Member ${userId} not found in guild ${serverId}`);
      return false;
    }

    // Remove all existing tier roles
    const allTierRoleIds = VOICE_TIERS.map(t => t.roleId);
    const currentTierRoles = member.roles.cache.filter(role => allTierRoleIds.includes(role.id));
    
    if (currentTierRoles.size > 0) {
      try {
        await member.roles.remove(currentTierRoles.map(r => r.id));
        console.log(`[ROLE] Removed ${currentTierRoles.size} old tier roles from user ${userId}`);
      } catch (removeError) {
        console.log(`[ERROR] Failed to remove old roles from user ${userId}:`, removeError.message);
      }
    }

    // Add new role
    try {
      await member.roles.add(correctTier.roleId);
      console.log(`[ROLE] Assigned role ${correctTier.name} to user ${userId} (${formatTime(userRecord.timeTotal)} total)`);
      
      // Update database with new role
      userRecord.roleId = correctTier.roleId;
      await userRecord.save();
      
      return true;
    } catch (addError) {
      console.log(`[ERROR] Failed to add role ${correctTier.name} to user ${userId}:`, addError.message);
      return false;
    }

  } catch (error) {
    console.error(`[ERROR] Role check failed for user ${userId}:`, error.message);
    return false;
  }
}

/**
 * Check and assign roles for all users in database
 */
async function checkAndAssignAllRoles() {
  try {
    const allUsers = await roleactive.find({});
    console.log(`[ROLE_CHECK] Checking roles for ${allUsers.length} users in database`);
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const userRecord of allUsers) {
      const success = await checkUserRole(userRecord.serverId, userRecord.userId, userRecord);
      if (success) {
        updatedCount++;
      } else {
        errorCount++;
      }
    }

    console.log(`[ROLE_CHECK] Completed: ${updatedCount} users updated, ${errorCount} errors`);
    return { updatedCount, errorCount };

  } catch (error) {
    console.error('[ERROR] Failed to check all roles:', error.message);
    return { updatedCount: 0, errorCount: 1 };
  }
}

/**
 * Format milliseconds to human readable time
 */
function formatTime(ms) {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Handle voice state updates
 */
bot.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.id || oldState.id;
  const serverId = newState.guild?.id || oldState.guild?.id;
  
  if (!serverId || !userId || newState.member?.user?.bot) {
    return;
  }

  const userKey = `${serverId}_${userId}`;
  const wasInVoice = oldState.channelId !== null;
  const isInVoice = newState.channelId !== null;
  const wasTracked = activeUsers.has(userKey) && !mutedUsers.has(userKey);
  const shouldTrack = isInVoice && shouldTrackUser(newState);

  // User joined voice
  if (!wasInVoice && isInVoice) {
    console.log(`[JOIN] User ${userId} joined voice channel ${newState.channel?.name} in server ${serverId}`);
    
    // Ensure user exists in database
    await getOrCreateUserRecord(serverId, userId);
    
    if (shouldTrack) {
      activeUsers.set(userKey, Date.now());
      mutedUsers.delete(userKey);
      console.log(`[TRACK] Started tracking user ${userId}`);
    } else {
      mutedUsers.add(userKey);
      console.log(`[MUTED] User ${userId} joined but is muted/deafened, not tracking`);
    }
  }
  
  // User left voice
  else if (wasInVoice && !isInVoice) {
    console.log(`[LEAVE] User ${userId} left voice channel in server ${serverId}`);
    
    if (wasTracked) {
      const joinTime = activeUsers.get(userKey);
      if (joinTime) {
        const sessionTime = Date.now() - joinTime;
        console.log(`[SESSION] User ${userId} session ended: ${formatTime(sessionTime)}`);
        await updateUserTime(serverId, userId, sessionTime);
      }
    }
    
    activeUsers.delete(userKey);
    mutedUsers.delete(userKey);
  }
  
  // User switched channels or mute/deaf status changed
  else if (wasInVoice && isInVoice) {
    const channelChanged = oldState.channelId !== newState.channelId;
    const muteChanged = oldState.mute !== newState.mute || oldState.deaf !== newState.deaf;
    
    if (channelChanged) {
      console.log(`[SWITCH] User ${userId} switched from ${oldState.channel?.name} to ${newState.channel?.name}`);
    }
    
    if (muteChanged) {
      console.log(`[STATUS] User ${userId} mute/deaf status changed: mute=${newState.mute}, deaf=${newState.deaf}`);
    }
    
    // If user was being tracked, save their current session
    if (wasTracked) {
      const joinTime = activeUsers.get(userKey);
      if (joinTime) {
        const sessionTime = Date.now() - joinTime;
        if (sessionTime >= CONFIG.MIN_SESSION_TIME) {
          await updateUserTime(serverId, userId, sessionTime);
        }
      }
    }
    
    // Update tracking status based on new state
    if (shouldTrack) {
      activeUsers.set(userKey, Date.now());
      mutedUsers.delete(userKey);
      if (!wasTracked) {
        console.log(`[TRACK] Started tracking user ${userId} (unmuted/undeafened)`);
      }
    } else {
      activeUsers.delete(userKey);
      mutedUsers.add(userKey);
      if (wasTracked) {
        console.log(`[MUTED] Stopped tracking user ${userId} (muted/deafened)`);
      }
    }
  }
});

/**
 * Periodic update for active users
 */
setInterval(async () => {
  const now = Date.now();
  const activeCount = activeUsers.size;
  
  if (activeCount === 0) {
    console.log('[INTERVAL] No active users to update');
    return;
  }
  
  console.log(`[INTERVAL] Updating ${activeCount} active users`);
  
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const [userKey, joinTime] of activeUsers.entries()) {
    const [serverId, userId] = userKey.split('_');
    const sessionTime = now - joinTime;
    
    try {
      const success = await updateUserTime(serverId, userId, sessionTime);
      if (success) {
        updatedCount++;
        // Reset join time for next interval
        activeUsers.set(userKey, now);
      } else {
        errorCount++;
      }
    } catch (error) {
      console.error(`[ERROR] Interval update failed for user ${userId}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`[INTERVAL] Completed: ${updatedCount} users updated, ${errorCount} errors`);
  
  // Run role check after updates
  await checkAndAssignAllRoles();
  
}, CONFIG.UPDATE_INTERVAL);

/**
 * Bot ready event - Initialize tracking for existing users
 */
bot.on('ready', async () => {
  console.log('[STARTUP] Bot is ready! Initializing voice tracking system...');
  
  let totalUsers = 0;
  let totalChannels = 0;
  
  for (const guild of bot.guilds.cache.values()) {
    console.log(`[STARTUP] Checking guild: ${guild.name} (${guild.id})`);
    
    const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2);
    totalChannels += voiceChannels.size;
    
    for (const channel of voiceChannels.values()) {
      console.log(`[STARTUP] Checking voice channel: ${channel.name} (${channel.members.size} members)`);
      
      for (const member of channel.members.values()) {
        if (member.user.bot) continue;
        
        totalUsers++;
        const userKey = `${guild.id}_${member.id}`;
        
        // Ensure user exists in database
        await getOrCreateUserRecord(guild.id, member.id);
        
        // Start tracking if user should be tracked
        if (shouldTrackUser(member.voice)) {
          activeUsers.set(userKey, Date.now());
          console.log(`[STARTUP] Started tracking existing user ${member.user.username} (${member.id})`);
        } else {
          mutedUsers.add(userKey);
          console.log(`[STARTUP] Found existing user ${member.user.username} (${member.id}) but they are muted/deafened`);
        }
      }
    }
  }
  
  console.log(`[STARTUP] Initialization complete: ${totalUsers} users found across ${totalChannels} voice channels`);
  console.log(`[STARTUP] Currently tracking: ${activeUsers.size} users`);
  
  // Run initial role check
  console.log('[STARTUP] Running initial role check...');
  const result = await checkAndAssignAllRoles();
  console.log(`[STARTUP] Initial role check complete: ${result.updatedCount} roles assigned`);
  
  console.log('[STARTUP] Voice tracking system fully operational!');
});

/**
 * Monthly reset - First day of each month at midnight
 */
cron.schedule('0 0 1 * *', async () => {
  console.log('[RESET] Starting monthly reset...');
  
  try {
    // Get stats before reset
    const userCount = await roleactive.countDocuments({});
    console.log(`[RESET] Resetting ${userCount} user records`);
    
    // Clear database
    await roleactive.deleteMany({});
    console.log('[RESET] Database cleared');
    
    // Remove all tier roles from all users
    let totalRolesRemoved = 0;
    
    for (const guild of bot.guilds.cache.values()) {
      console.log(`[RESET] Processing guild: ${guild.name}`);
      
      for (const roleId of VOICE_TIERS.map(tier => tier.roleId)) {
        try {
          const role = guild.roles.cache.get(roleId);
          if (role && role.members.size > 0) {
            console.log(`[RESET] Removing role ${role.name} from ${role.members.size} members`);
            
            for (const member of role.members.values()) {
              try {
                await member.roles.remove(roleId);
                totalRolesRemoved++;
              } catch (error) {
                console.log(`[ERROR] Failed to remove role from user ${member.id}:`, error.message);
              }
            }
          }
        } catch (error) {
          console.error(`[ERROR] Failed to process role ${roleId}:`, error.message);
        }
      }
    }
    
    // Clear active tracking
    activeUsers.clear();
    mutedUsers.clear();
    
    console.log(`[RESET] Monthly reset completed successfully!`);
    console.log(`[RESET] - ${userCount} user records cleared`);
    console.log(`[RESET] - ${totalRolesRemoved} roles removed`);
    console.log(`[RESET] - ${activeUsers.size} active users cleared`);
    
  } catch (error) {
    console.error('[ERROR] Monthly reset failed:', error.message);
  }
});