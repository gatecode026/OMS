import assert from 'assert';
import database from '../src/config/database.js';
import Employee from '../src/modules/employees/employees.model.js';
import Conversation from '../src/modules/chat/conversation.model.js';
import Message from '../src/modules/chat/message.model.js';
import { runWithTenant } from '../src/utils/tenantContext.js';
import conversationRepository from '../src/modules/chat/conversation.repository.js';
import messageRepository from '../src/modules/chat/message.repository.js';
import { setQueryLogging } from '../src/security/repositoryContract.js';

const testChatAuthorization = async () => {
  console.log('--- Starting Chat Security Authorization Tests ---');
  
  await database.connect();
  setQueryLogging(false); // Clean stdout

  try {
    // 1. Setup mock records in tenant database COMP-A
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Conversation.deleteMany({});
      await Message.deleteMany({});

      // Seed Employees
      await Employee.create({
        id: 'EMP-DEV-1',
        employeeCode: 'DEV-1',
        name: 'Developer Joe',
        email: 'joe@test.com',
        phone: '1111111111',
        branch: 'Jaipur Branch',
        department: 'Engineering',
        roleId: 'employee',
        role: 'Employee',
        status: 'Active',
        accountStatus: 'Active'
      });

      await Employee.create({
        id: 'EMP-DEV-2',
        employeeCode: 'DEV-2',
        name: 'Developer Pete',
        email: 'pete@test.com',
        phone: '2222222222',
        branch: 'Jaipur Branch',
        department: 'Engineering',
        roleId: 'employee',
        role: 'Employee',
        status: 'Active',
        accountStatus: 'Active'
      });

      await Employee.create({
        id: 'EMP-OUTSIDER',
        employeeCode: 'OUTSIDER',
        name: 'Outsider Dave',
        email: 'dave@test.com',
        phone: '3333333333',
        branch: 'Hyderabad Branch',
        department: 'Marketing',
        roleId: 'employee',
        role: 'Employee',
        status: 'Active',
        accountStatus: 'Active'
      });

      // Seed Conversation (Direct between Joe and Pete)
      await Conversation.create({
        id: 'CONV-JOE-PETE',
        type: 'direct',
        participants: [
          { employeeId: 'EMP-DEV-1', name: 'Developer Joe', role: 'employee' },
          { employeeId: 'EMP-DEV-2', name: 'Developer Pete', role: 'employee' }
        ]
      });

      // Seed Message in conversation from Joe
      await Message.create({
        id: 'MSG-JOE-1',
        conversationId: 'CONV-JOE-PETE',
        senderId: 'EMP-DEV-1',
        senderName: 'Developer Joe',
        content: 'Hello Pete!'
      });

      console.log('🌱 Seeded COMP-A Employees, Conversations, and Messages.');
    });

    // ----------------------------------------
    // CHAT SECURITY TESTS
    // ----------------------------------------

    // TC-CHAT-01: Participant can read own conversation
    console.log('\nTEST 1: Participant reads own conversation...');
    await runWithTenant('COMP-A', async () => {
      const conv = await conversationRepository.findOne({ id: 'CONV-JOE-PETE' });
      assert.strictEqual(conv.id, 'CONV-JOE-PETE', 'Should find conversation');
      console.log('✅ Participant read conversation successfully.');
    }, false, { id: 'EMP-DEV-1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-CHAT-02: Outsider cannot read conversation
    console.log('\nTEST 2: Outsider reading conversation is blocked...');
    await runWithTenant('COMP-A', async () => {
      try {
        await conversationRepository.findOne({ id: 'CONV-JOE-PETE' });
        assert.fail('Outsider should not be allowed to find conversation');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should reject with 403');
        console.log('✅ Outsider read blocked.');
      }
    }, false, { id: 'EMP-OUTSIDER', role: 'employee', branch: 'Hyderabad Branch', department: 'Marketing' });

    // TC-CHAT-03: Participant can read messages in conversation
    console.log('\nTEST 3: Participant reads messages in own conversation...');
    await runWithTenant('COMP-A', async () => {
      const msgs = await messageRepository.find({ conversationId: 'CONV-JOE-PETE' });
      assert.strictEqual(msgs.length, 1, 'Should find 1 message');
      assert.strictEqual(msgs[0].id, 'MSG-JOE-1', 'Should match MSG-JOE-1');
      console.log('✅ Participant read messages successfully.');
    }, false, { id: 'EMP-DEV-1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-CHAT-04: Outsider cannot read messages in conversation
    console.log('\nTEST 4: Outsider reading messages in conversation is blocked...');
    await runWithTenant('COMP-A', async () => {
      try {
        await messageRepository.find({ conversationId: 'CONV-JOE-PETE' });
        assert.fail('Outsider should not be allowed to query messages');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should return 403');
        console.log('✅ Outsider message read blocked.');
      }
    }, false, { id: 'EMP-OUTSIDER', role: 'employee', branch: 'Hyderabad Branch', department: 'Marketing' });

    // TC-CHAT-05: Outsider cannot send message to conversation
    console.log('\nTEST 5: Outsider sending message is blocked...');
    await runWithTenant('COMP-A', async () => {
      try {
        await messageRepository.create({
          id: 'MSG-OUTSIDER-1',
          conversationId: 'CONV-JOE-PETE',
          senderId: 'EMP-OUTSIDER',
          senderName: 'Outsider Dave',
          content: 'Hehehe'
        });
        assert.fail('Outsider should be blocked from sending messages');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should reject message creation with 403');
        console.log('✅ Outsider message send blocked.');
      }
    }, false, { id: 'EMP-OUTSIDER', role: 'employee', branch: 'Hyderabad Branch', department: 'Marketing' });

    // TC-CHAT-06: Participant can edit own message
    console.log('\nTEST 6: Participant edits own message...');
    await runWithTenant('COMP-A', async () => {
      const updated = await messageRepository.findOneAndUpdate({ id: 'MSG-JOE-1' }, { content: 'Hello Pete! (Edited)' });
      assert.strictEqual(updated.content, 'Hello Pete! (Edited)', 'Should update content');
      console.log('✅ Own message edit allowed.');
    }, false, { id: 'EMP-DEV-1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-CHAT-07: Participant cannot edit another participant's message
    console.log('\nTEST 7: Participant editing another\'s message is blocked...');
    await runWithTenant('COMP-A', async () => {
      try {
        await messageRepository.findOneAndUpdate({ id: 'MSG-JOE-1' }, { content: 'Hacked by Pete!' });
        assert.fail('Pete should be blocked from editing Joe\'s message');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should return 403');
        console.log('✅ Another participant\'s message edit blocked.');
      }
    }, false, { id: 'EMP-DEV-2', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

  } catch (error) {
    console.error('❌ Chat Security Tests failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Conversation.deleteMany({});
      await Message.deleteMany({});
    });
    await database.disconnect();
    console.log('\n🎉 ALL CHAT SECURITY TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  }
};

testChatAuthorization();
