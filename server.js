import { serve } from "bun";
import { randomUUID } from "crypto";

// Store groups, their members, and their metadata
const groups = new Map();
// Map groupNames to groupIds for lookup
const groupNameToId = new Map();

// WebSocket server
serve({
  port: 3000,
  fetch(req, server) {
    // Handle WebSocket upgrade for /artillery endpoint
    if (req.url.endsWith('/artillery')) {
      const success = server.upgrade(req);
      return success ? undefined : new Response('WebSocket upgrade failed', { status: 400 });
    }

    return new Response('Artillery WebSocket Server');
  },
  websocket: {
    open(ws) {
      // WebSocket opened
      ws.data = { groupId: null, groupName: null, playerName: null, playerId: null };
      console.log(`🔌 New connection established`);
    },
    message(ws, message) {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'join') {
          const { groupName, playerName, playerId, password, inputs } = data;
          
          // Leave previous group if exists
          if (ws.data.groupId) {
            leaveGroup(ws);
          }
          
          // Join new group with password
          const result = joinGroup(ws, groupName, playerName, playerId, password, inputs);
          
          // If join was successful, send the groupId back to the client
          if (result.success) {
            ws.send(JSON.stringify({
              type: 'joinSuccess',
              data: {
                groupId: result.groupId,
                groupName
              }
            }));
          }
        }
        // Handle calculation message
        else if (data.type === 'calculation' && ws.data.groupId) {
          const { groupId } = ws.data;
          const group = groups.get(groupId);
          
          // Store the calculation
          if (group) {
            group.currentCalculation = data.calculation;
            console.log(`💾 Stored calculation for group "${group.name}"`);
          }
          
          // Broadcast to others
          broadcastToGroup(ws, {
            type: 'calculation',
            data: data.calculation
          });
        }
        // Handle input update message
        else if (data.type === 'inputUpdate' && ws.data.groupId) {
          const { groupId } = ws.data;
          const group = groups.get(groupId);
          
          // Store the input values
          if (group) {
            group.inputValues = data.inputs;
            console.log(`💾 Updated input values for group "${group.name}"`);
          }
          
          // Broadcast to others
          broadcastToGroup(ws, {
            type: 'inputUpdate',
            data: data.inputs
          });
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    },
    close(ws) {
      // Remove from group when disconnected
      leaveGroup(ws);
    }
  }
});

// Function to join a group
function joinGroup(ws, groupName, playerName, playerId, password, inputs) {
  let groupId;
  
  // Check if group exists by name
  if (groupNameToId.has(groupName)) {
    groupId = groupNameToId.get(groupName);
    const group = groups.get(groupId);
    
    // If group has a password and the provided password doesn't match
    if (group.password && group.password !== password) {
      // Send authentication error and log
      ws.send(JSON.stringify({
        type: 'error',
        data: {
          code: 'auth_failed',
          message: 'Incorrect password for this group'
        }
      }));
      console.log(`🔒 Authentication failed: User "${playerName}" (${playerId.substring(0, 8)}) tried to join "${groupName}" with incorrect password`);
      return { success: false };
    }
    
    console.log(`👋 User "${playerName}" (${playerId.substring(0, 8)}) joined existing group "${groupName}" (${groupId.substring(0, 8)})`);
  } else {
    // Create a new group with the provided password and a UUID
    groupId = randomUUID();
    groups.set(groupId, {
      name: groupName,
      members: new Map(),
      password: password || null, // Store password if provided
      inputValues: inputs || {}, // Initialize empty input values storage
      currentCalculation: null // Initialize empty calculation result
    });
    
    // Map the group name to the UUID for future lookups
    groupNameToId.set(groupName, groupId);
    
    console.log(`🆕 New group created: "${groupName}" (${groupId.substring(0, 8)}) by "${playerName}" (${playerId.substring(0, 8)})${password ? ' [Password protected]' : ''}`);
  }
  
  const group = groups.get(groupId);
  
  // Store connection data
  ws.data.groupId = groupId;
  ws.data.groupName = groupName;
  ws.data.playerName = playerName;
  ws.data.playerId = playerId;
  
  // Add to group using playerId as the key
  group.members.set(playerId, {
    ws,
    name: playerName,
    id: playerId
  });
  
  // Send current input values to the newly joined user if they exist
  if (group.inputValues && Object.keys(group.inputValues).length > 0) {
    ws.send(JSON.stringify({
      type: 'inputUpdate',
      data: group.inputValues
    }));
    console.log(`📤 Sent current input values to new member "${playerName}" in group "${groupName}"`);
  }
  
  // Send current calculation to the newly joined user if it exists
  if (group.currentCalculation) {
    ws.send(JSON.stringify({
      type: 'calculation',
      data: group.currentCalculation
    }));
    console.log(`📤 Sent current calculation to new member "${playerName}" in group "${groupName}"`);
  }
  
  // Send updated group info to all members
  updateGroupInfo(groupId);
  
  // Log current state
  const totalMembers = group.members.size;
  console.log(`ℹ️ Group "${groupName}" now has ${totalMembers} member${totalMembers !== 1 ? 's' : ''}`);
  
  return { success: true, groupId };
}

// Function to leave a group
function leaveGroup(ws) {
  const { groupId, groupName, playerId, playerName } = ws.data;
  
  if (groupId && groups.has(groupId)) {
    const group = groups.get(groupId);
    
    // Remove member by playerId
    if (playerId && group.members.has(playerId)) {
      group.members.delete(playerId);
      console.log(`👋 User "${playerName}" (${playerId.substring(0, 8)}) left group "${groupName}" (${groupId.substring(0, 8)})`);
    }
    
    // Delete empty groups
    if (group.members.size === 0) {
      groups.delete(groupId);
      // Remove the mapping from group name to this group ID
      if (group.name && groupNameToId.get(group.name) === groupId) {
        groupNameToId.delete(group.name);
      }
      console.log(`🗑️ Group "${groupName}" (${groupId.substring(0, 8)}) deleted (no members remaining)`);
    } else {
      // Update group info for remaining members
      updateGroupInfo(groupId);
      
      // Log current state
      const totalMembers = group.members.size;
      console.log(`ℹ️ Group "${groupName}" now has ${totalMembers} member${totalMembers !== 1 ? 's' : ''}`);
    }
  }
  
  // Clear connection data
  ws.data.groupId = null;
  ws.data.groupName = null;
  ws.data.playerName = null;
  ws.data.playerId = null;
}

// Function to broadcast a message to all group members
function broadcastToGroup(ws, message) {
  const { groupId, playerId } = ws.data;
  
  if (groupId && groups.has(groupId)) {
    const group = groups.get(groupId);
    
    // Send to all members except sender
    for (const [memberId, member] of group.members.entries()) {
      if (memberId !== playerId) {
        member.ws.send(JSON.stringify(message));
      }
    }
  }
}

// Function to update group info for all members
function updateGroupInfo(groupId) {
  if (!groups.has(groupId)) return;
  
  const group = groups.get(groupId);
  const members = Array.from(group.members.values()).map(member => ({
    name: member.name,
    id: member.id
  }));
  
  const message = {
    type: 'groupInfo',
    data: {
      groupName: group.name,
      memberCount: members.length,
      members,
      requiresPassword: !!group.password
    }
  };
  
  // Send updated info to all members
  for (const member of group.members.values()) {
    member.ws.send(JSON.stringify(message));
  }
}

const port = 3000;
console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║  🚀 Artillery WebSocket Server                 ║
║  Running on port ${port}                         ║
║                                                ║
╚════════════════════════════════════════════════╝
`); 