import React, { useState } from 'react';
import './Workflows.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import SlideOver from '../components/common/SlideOver';
import {
  GitMerge,
  Play,
  Settings,
  ToggleLeft,
  ToggleRight,
  Plus,
  GitFork,
  ArrowRight,
  HelpCircle,
  Check,
  Save,
  Trash2,
  AlertCircle
} from 'lucide-react';

const initialRecipes = [
  {
    id: 'W-01',
    name: 'Auto-Approve Leaves',
    description: 'Automatically approves any sick leave or annual leave request shorter than 2 days.',
    status: 'active',
    category: 'hr',
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Leave Request Created', desc: 'Any employee submits leave' },
      { id: 'n2', type: 'condition', label: 'Duration < 2 Days', desc: 'Checks duration parameter' },
      { id: 'n3', type: 'action', label: 'Approve Automatically', desc: 'Updates status to Approved' }
    ]
  },
  {
    id: 'W-02',
    name: 'Late Check-in Alerts',
    description: 'Trigger notification if employee fails to punch in by 10:00 AM without approved leave.',
    status: 'active',
    category: 'attendance',
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Time is 10:00 AM', desc: 'Daily cron scheduler check' },
      { id: 'n2', type: 'condition', label: 'Not Punched In & Active', desc: 'Check presence status' },
      { id: 'n3', type: 'action', label: 'Send Alert to Team Lead', desc: 'Sends Slack/In-app message' }
    ]
  },
  {
    id: 'W-03',
    name: 'Monthly Payroll Run Notification',
    description: 'Notify Super Admins and HR Managers 3 days before final payroll disbursement.',
    status: 'inactive',
    category: 'payroll',
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Calendar Date 25th', desc: 'Monthly recurrence schedule' },
      { id: 'n2', type: 'condition', label: 'Status is Pending Run', desc: 'Verify payroll batch' },
      { id: 'n3', type: 'action', label: 'Broadcast Admin Alert', desc: 'Pushes notification alert' }
    ]
  }
];

const Workflows = () => {
  const { addToast } = useApp();
  const loading = usePageLoading();

  const [recipes, setRecipes] = useState(initialRecipes);
  const [selectedRecipe, setSelectedRecipe] = useState(initialRecipes[0]);
  const [activeNode, setActiveNode] = useState(initialRecipes[0].nodes[0]);
  
  // Custom slide-over trigger for creating a new workflow
  const [newWorkflowOpen, setNewWorkflowOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDesc, setNewWorkflowDesc] = useState('');

  // Node config editor inputs
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeDesc, setNodeDesc] = useState('');

  React.useEffect(() => {
    if (selectedRecipe) {
      // Auto highlight first node when recipe changes
      setActiveNode(selectedRecipe.nodes[0]);
      setNodeLabel(selectedRecipe.nodes[0].label);
      setNodeDesc(selectedRecipe.nodes[0].desc);
    }
  }, [selectedRecipe]);

  const selectNode = (node) => {
    setActiveNode(node);
    setNodeLabel(node.label);
    setNodeDesc(node.desc);
  };

  const handleToggleStatus = (recipeId) => {
    setRecipes(prev =>
      prev.map(r => {
        if (r.id === recipeId) {
          const nextStatus = r.status === 'active' ? 'inactive' : 'active';
          addToast(
            nextStatus === 'active' ? 'success' : 'warning',
            `Workflow "${r.name}" has been ${nextStatus === 'active' ? 'activated' : 'deactivated'}.`
          );
          const updated = { ...r, status: nextStatus };
          if (selectedRecipe.id === recipeId) {
            setSelectedRecipe(updated);
          }
          return updated;
        }
        return r;
      })
    );
  };

  const handleUpdateNode = (e) => {
    e.preventDefault();
    setRecipes(prev =>
      prev.map(r => {
        if (r.id === selectedRecipe.id) {
          const updatedNodes = r.nodes.map(n =>
            n.id === activeNode.id ? { ...n, label: nodeLabel, desc: nodeDesc } : n
          );
          const updated = { ...r, nodes: updatedNodes };
          setSelectedRecipe(updated);
          return updated;
        }
        return r;
      })
    );
    addToast('success', 'Node configuration saved successfully!');
  };

  const handleCreateWorkflow = (e) => {
    e.preventDefault();
    if (!newWorkflowName || !newWorkflowDesc) {
      addToast('error', 'Please fill in all fields.');
      return;
    }

    const newW = {
      id: `W-0${recipes.length + 1}`,
      name: newWorkflowName,
      description: newWorkflowDesc,
      status: 'inactive',
      category: 'custom',
      nodes: [
        { id: 'n1', type: 'trigger', label: 'Default Trigger', desc: 'Define rule initiation event' },
        { id: 'n2', type: 'condition', label: 'Default Condition', desc: 'Define logical parameters' },
        { id: 'n3', type: 'action', label: 'Default Action', desc: 'Define system outcomes' }
      ]
    };

    setRecipes(prev => [...prev, newW]);
    setSelectedRecipe(newW);
    setNewWorkflowOpen(false);
    setNewWorkflowName('');
    setNewWorkflowDesc('');
    addToast('success', `Workflow "${newW.name}" created as draft.`);
  };

  if (loading) {
    return (
      <div className="page-loading-wrapper">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="workflows-page animate-fade-in">
      {/* Header section */}
      <div className="workflows-header">
        <div className="workflows-title-section">
          <h1>Workflow Management</h1>
          <p className="subtitle">Design, configure, and manage automated organizational triggers and actions.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setNewWorkflowOpen(true)}>
          Create Workflow
        </Button>
      </div>

      {/* Main split */}
      <div className="workflows-grid">
        {/* Left Column: List of Workflows */}
        <div className="workflows-sidebar card">
          <div className="card-header">
            <h3>Automation Recipes</h3>
            <span className="card-subtitle">Active and draft system rules</span>
          </div>

          <div className="recipes-list">
            {recipes.map((r) => {
              const isActive = selectedRecipe.id === r.id;
              return (
                <div key={r.id} className={`recipe-card ${isActive ? 'active' : ''}`}>
                  <div className="recipe-card-header" onClick={() => setSelectedRecipe(r)}>
                    <div className="recipe-title-section">
                      <span className="recipe-code">{r.id}</span>
                      <h4 className="recipe-name">{r.name}</h4>
                    </div>
                    <Badge variant={r.status === 'active' ? 'success' : 'secondary'}>
                      {r.status === 'active' ? 'Active' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="recipe-desc" onClick={() => setSelectedRecipe(r)}>{r.description}</p>
                  
                  <div className="recipe-actions">
                    <button
                      className="toggle-status-btn"
                      onClick={() => handleToggleStatus(r.id)}
                      title={r.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      {r.status === 'active' ? (
                        <ToggleRight size={22} className="text-primary" />
                      ) : (
                        <ToggleLeft size={22} className="text-secondary" />
                      )}
                      <span>{r.status === 'active' ? 'Active' : 'Paused'}</span>
                    </button>

                    <button className="recipe-detail-btn" onClick={() => setSelectedRecipe(r)}>
                      <Settings size={14} /> Configure
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Diagram Canvas */}
        <div className="workflow-canvas-container card">
          <div className="canvas-header-strip">
            <div>
              <h3>Visual Canvas: {selectedRecipe.name}</h3>
              <p className="canvas-subtitle">{selectedRecipe.description}</p>
            </div>
          </div>

          {/* Node Chart Row */}
          <div className="canvas-workspace">
            <div className="node-flow-trail">
              {selectedRecipe.nodes.map((node, index) => {
                const isSelected = activeNode.id === node.id;
                return (
                  <React.Fragment key={node.id}>
                    <div
                      className={`canvas-node ${node.type} ${isSelected ? 'selected' : ''}`}
                      onClick={() => selectNode(node)}
                    >
                      <div className="node-type-indicator">{node.type.toUpperCase()}</div>
                      <h4 className="node-label">{node.label}</h4>
                      <p className="node-desc">{node.desc}</p>
                    </div>

                    {index < selectedRecipe.nodes.length - 1 && (
                      <div className="flow-arrow-wrapper">
                        <ArrowRight size={20} className="arrow-flow" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Selected Node Details Form Panel */}
            <div className="node-config-panel">
              <div className="node-config-header">
                <Settings size={16} className="text-primary" />
                <h4>Edit Node Details: {activeNode.type.toUpperCase()}</h4>
              </div>

              <form onSubmit={handleUpdateNode} className="node-config-form">
                <div className="form-group">
                  <label>Node Title</label>
                  <input
                    type="text"
                    value={nodeLabel}
                    onChange={(e) => setNodeLabel(e.target.value)}
                    required
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Description / Parameters</label>
                  <textarea
                    rows="3"
                    value={nodeDesc}
                    onChange={(e) => setNodeDesc(e.target.value)}
                    required
                    className="form-control text-area-control"
                  />
                </div>

                <div className="node-warning-banner">
                  <AlertCircle size={14} className="warning-icon" />
                  <p>Changes apply instantly to the current selected recipe schema.</p>
                </div>

                <Button variant="primary" size="sm" type="submit" icon={Save}>
                  Save Configuration
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over to create a new workflow */}
      <SlideOver
        isOpen={newWorkflowOpen}
        onClose={() => setNewWorkflowOpen(false)}
        title="Create New Automation Workflow"
      >
        <form onSubmit={handleCreateWorkflow} className="slideover-form">
          <div className="form-group">
            <label htmlFor="wf-name">Workflow Rule Name</label>
            <input
              id="wf-name"
              type="text"
              placeholder="e.g. Birthday Celebration Auto-Message"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="wf-desc">Rule Description</label>
            <textarea
              id="wf-desc"
              placeholder="Describe the trigger, filters, and logical action outcome of this recipe."
              rows="4"
              value={newWorkflowDesc}
              onChange={(e) => setNewWorkflowDesc(e.target.value)}
              required
              className="form-control"
            />
          </div>

          <div className="form-actions">
            <Button variant="secondary" type="button" onClick={() => setNewWorkflowOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Automation
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
};

export default Workflows;
