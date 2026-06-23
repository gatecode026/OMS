import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  const connection = await getTenantConnection('COMP-001');
  
  const Employee = connection.models['Employee'] || connection.model('Employee', new mongoose.Schema({}, { strict: false }));
  const Project = connection.models['Project'] || connection.model('Project', new mongoose.Schema({}, { strict: false }));
  const Team = connection.models['Team'] || connection.model('Team', new mongoose.Schema({}, { strict: false }));
  const Attendance = connection.models['Attendance'] || connection.model('Attendance', new mongoose.Schema({}, { strict: false }));
  
  const employees = await Employee.find({}).lean();
  const projectsList = await Project.find({}).lean();
  const teams = await Team.find({}).lean();
  const attendance = await Attendance.find({}).lean();
  
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
        
        // Avoid false 0%
        if (dynamicSuccessRate === 0) {
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
        activeProjects: managedProjects.filter(p => p.status === 'In Progress' || p.status === 'Active' || p.status === 'Planning').length,
        teamMembers: teamMembersCount,
        managedProjectsCount: managedProjects.length,
        managedTeamsCount: managedTeams.length
      };
    });

  console.log('--- Managers mapped ---');
  console.log(pmList);
  
  const total = pmList.length;
  const rate = total > 0 ? Math.round(pmList.reduce((s, p) => s + p.successRate, 0) / total) : 0;
  const avgProductivityAll = total > 0 ? Math.round(pmList.reduce((sum, pm) => sum + pm.productivity, 0) / total) : 0;
  
  console.log(`Summary rate (Avg Delivery Rate): ${rate}%`);
  console.log(`Avg Team Productivity: ${avgProductivityAll}%`);
  
  await mongoose.disconnect();
}

check().catch(console.error);
