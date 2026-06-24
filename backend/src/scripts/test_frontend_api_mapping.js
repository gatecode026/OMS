import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);

async function test() {
  console.log('Logging in to backend as Geeta...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'geeta@gmail.com',
      password: 'password123'
    })
  });
  
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status}`);
  }
  
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  console.log('Token retrieved successfully!');

  // Fetch employees
  const empRes = await fetch('http://localhost:5000/api/v1/employees', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const employees = (await empRes.json()).data;
  
  // Fetch projects
  const projRes = await fetch('http://localhost:5000/api/v1/projects', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const projectsList = (await projRes.json()).data;

  // Fetch teams
  const teamRes = await fetch('http://localhost:5000/api/v1/teams', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const teams = (await teamRes.json()).data;

  // Fetch attendance
  const attRes = await fetch('http://localhost:5000/api/v1/attendance', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const attendance = (await attRes.json()).data || [];

  console.log(`Fetched counts: employees=${employees?.length}, projects=${projectsList?.length}, teams=${teams?.length}, attendance=${attendance?.length}`);

  // Replicate AppContext tasks memoization
  const tasks = [];
  projectsList.forEach(proj => {
    if (proj.tasks) {
      proj.tasks.forEach(t => {
        tasks.push({
          ...t,
          projectId: proj.id,
          projectName: proj.name
        });
      });
    }
  });

  // Replicate Managers.jsx SYNC_DATA
  const pmList = employees
    .filter(e => (e.roleId === 'manager' || e.designation?.toLowerCase().includes('manager')) && e.status !== 'Inactive')
    .map(emp => {
      const managedProjects = projectsList.filter(p => p.manager === emp.name || p.managerId === emp.id);
      const projectIds = managedProjects.map(p => p.id);
      const managedTeams = teams.filter(t => managedProjects.some(p => p.leader === t.leader || p.id === t.projectId) || t.department === emp.department);
      const teamLeaderNames = managedTeams.map(t => t.leader);
      const teamLeadersUnderManager = employees.filter(e => e.roleId === 'team_leader' && teamLeaderNames.includes(e.name) && e.status !== 'Inactive');
      const teamLeaderIds = teamLeadersUnderManager.map(e => e.id);
      const teamMembersCount = new Set(managedTeams.flatMap(t => (t.membersList || []).map(m => m.id))).size;
      
      const pmTasks = (tasks || []).filter(t => projectIds.includes(t.projectId));
      let dynamicSuccessRate = 0;
      if (pmTasks.length > 0) {
        const completed = pmTasks.filter(t => t.completed || t.status === 'Done' || t.status === 'Completed').length;
        dynamicSuccessRate = Math.round((completed / pmTasks.length) * 100);
      } else {
        if (managedTeams.length > 0) {
          const teamRates = managedTeams.map(t => {
            const teamMemberIds = new Set((t.membersList || []).map(m => m.id));
            const teamTasks = (tasks || []).filter(task => teamMemberIds.has(task.assigneeId));
            if (teamTasks.length > 0) {
              const completed = teamTasks.filter(task => task.completed || task.status === 'Done' || task.status === 'Completed').length;
              return Math.round((completed / teamTasks.length) * 100);
            }
            const teamLeaderEmp = employees.find(e => e.name === t.leader);
            return teamLeaderEmp?.productivityScore || t.productivity || 90;
          });
          dynamicSuccessRate = Math.round(teamRates.reduce((sum, val) => sum + val, 0) / teamRates.length);
        } else {
          dynamicSuccessRate = emp.productivityScore || 85;
        }
      }

      return {
        name: emp.name,
        successRate: dynamicSuccessRate,
        productivity: dynamicSuccessRate,
        managedProjectsCount: managedProjects.length,
        managedTeamsCount: managedTeams.length
      };
    });

  console.log('--- API Mapped Managers ---');
  console.log(pmList);

  const total = pmList.length;
  const rate = total > 0 ? Math.round(pmList.reduce((s, p) => s + p.successRate, 0) / total) : 0;
  const avgProductivityAll = total > 0 ? Math.round(pmList.reduce((sum, pm) => sum + pm.productivity, 0) / total) : 0;
  
  console.log(`Calculated Avg Delivery Rate: ${rate}%`);
  console.log(`Calculated Avg Team Productivity: ${avgProductivityAll}%`);
}

test().catch(console.error);
