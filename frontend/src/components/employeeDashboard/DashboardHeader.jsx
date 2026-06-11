import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, RefreshCw, MessageSquare, Code, Users, LineChart, DollarSign, ExternalLink } from 'lucide-react';

const DEPT_FACTS = {
  bpo: [
    "📞 Support Pro-Tip: Active listening can resolve over 80% of customer issues on the first contact! Try summarizing their concern to show alignment.",
    "🎧 Industry Fact: The world's first customer call centers emerged in the 1960s. Today, customer experience is the #1 brand differentiator.",
    "💬 Communication Tip: Speaking at a moderate, friendly pace improves customer satisfaction ratings by up to 35%. Tone is everything!",
    "💡 Quality Focus: A brief pause to verify information is highly valued by clients. Accuracy always beats rushed, incorrect answers.",
    "🎧 Engagement Metric: Resolving a complaint in the client's favor makes them 70% more likely to return. Your support builds lasting loyalty!"
  ],
  tech: [
    "💻 Debugging Trivia: The term 'bug' was popularized in 1947 when Grace Hopper found a physical moth trapped in a Harvard Mark II relay!",
    "⚡ Clean Code Tip: Refactoring small pieces of code continuously prevents technical debt. Always leave the codebase cleaner than you found it.",
    "👩‍💻 Pioneer Fact: Ada Lovelace wrote the first computer algorithm in 1843 for Babbage's Analytical Engine, becoming the first programmer.",
    "🧠 Brain Hack: Taking a 5-minute break every hour restores logical problem-solving capacity and prevents decision fatigue.",
    "🧩 Problem Solving: Stuck on a bug? Try 'Rubber Duck Debugging'—explaining your code line-by-line to an inanimate object forces clarity."
  ],
  hr: [
    "👥 Retention Metric: Companies with consistent employee recognition programs see 31% lower voluntary team turnover.",
    "🌟 Growth Tip: A structured onboarding experience improves employee retention rates by 82%. First impressions matter!",
    "💼 Team Culture: Psychological safety is the single highest predictor of high-performing, innovative teams.",
    "📈 Growth Psychology: Providing constructive, actionable feedback combined with praise is the fastest way to build workplace trust.",
    "🧩 Connection Hack: High social connection at work is directly linked to higher job satisfaction and productivity."
  ],
  sales: [
    "📈 Solution Selling: Focusing on solving the prospect's actual pain point rather than just pitching features converts 3x better.",
    "📣 Marketing Trivia: The first online banner ad went live in 1994, achieving an unbelievable click-through rate of 44%!",
    "🎯 Narrative Power: Brand storytelling is remembered up to 22 times more than pure statistics. Sell the journey, not just the stats.",
    "💡 Persistence Payoff: 80% of sales require 5 follow-ups, yet 44% of sales professionals stop following up after the first contact.",
    "🎯 CTA Focus: Having a single, high-contrast Call-to-Action button on a landing page increases conversions by up to 42%."
  ],
  finance: [
    "📊 Accounting Trivia: Double-entry bookkeeping was formalized in 1494 by Luca Pacioli, who was Leonardo da Vinci's math tutor!",
    "💰 Efficiency Hack: Meticulous reconciliation at the start of the week prevents stressful month-end reporting delays.",
    "📁 Budget History: The word 'budget' comes from the old French 'bougette', meaning a small leather pouch used to carry money.",
    "💡 Automation Tip: Automating recurring journal entries and invoice matching saves finance departments an average of 15 hours monthly.",
    "📁 Security Focus: Maintaining structured digital trails for every single expense ensures compliance and makes audits stress-free."
  ],
  general: [
    "✨ Productivity Tip: Defining just three micro-goals at the start of your day increases focus and task completion by 40%.",
    "🌱 Inspiration: 'Success is the sum of small efforts, repeated day in and day out.' Keep shining and making progress today!",
    "🤝 Collaboration Tip: Great achievements are always the result of team synergy. Reach out and appreciate a colleague today.",
    "🧠 Focus Hack: The Pomodoro Technique (25 minutes of focus, 5 minutes of rest) prevents mental fatigue and keeps output high.",
    "⚡ Focus Fact: Multitasking reduces cognitive performance by 40% and increases error rates. Single-tasking is the true superpower."
  ]
};

const DEPT_SEARCH_TERMS = {
  bpo: [
    "Customer service",
    "Customer experience",
    "Active listening",
    "Call center",
    "Customer relationship management",
    "Technical support",
    "Client relationship",
    "Communication skills"
  ],
  tech: [
    "Software engineering",
    "Computer science",
    "Web development",
    "Artificial intelligence",
    "Cloud computing",
    "Software design pattern",
    "Version control",
    "Cybersecurity",
    "Agile software development",
    "DevOps"
  ],
  hr: [
    "Human resource management",
    "Employee engagement",
    "Talent management",
    "Organizational culture",
    "Onboarding",
    "Workplace wellness",
    "Team building"
  ],
  sales: [
    "Marketing strategy",
    "Sales techniques",
    "Digital marketing",
    "Brand positioning",
    "Content marketing",
    "Conversion optimization",
    "Customer acquisition"
  ],
  finance: [
    "Financial accounting",
    "Corporate finance",
    "Double-entry bookkeeping",
    "Cash flow management",
    "Cost accounting",
    "Asset management",
    "Auditing"
  ],
  general: [
    "Productivity hacks",
    "Time management",
    "Pomodoro Technique",
    "Goal setting",
    "Eisenhower Matrix",
    "Active learning",
    "Creative problem solving"
  ]
};

const DashboardHeader = ({ currentUser }) => {
  if (!currentUser) return null;

  const [factData, setFactData] = useState({
    title: '',
    description: '',
    extract: '',
    url: ''
  });
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  // Calculate day and time greetings
  const timeOfDayGreeting = useMemo(() => {
    const hours = new Date().getHours();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[new Date().getDay()];

    let timeOfDay = 'Day';
    if (hours < 12) timeOfDay = 'Morning';
    else if (hours < 17) timeOfDay = 'Afternoon';
    else timeOfDay = 'Evening';

    return `Good ${timeOfDay} • Happy ${dayName}`;
  }, []);


  // Select appropriate icons and categories based on department
  const deptMeta = useMemo(() => {
    const dept = (currentUser.department || '').toLowerCase();
    const designation = (currentUser.designation || '').toLowerCase();

    const isBpo = dept.includes('bpo') || dept.includes('support') || dept.includes('service') || dept.includes('call') || designation.includes('bpo');
    const isTech = dept.includes('it') || dept.includes('engineer') || dept.includes('tech') || dept.includes('dev') || dept.includes('code') || designation.includes('developer');
    const isHr = dept.includes('hr') || dept.includes('resource') || dept.includes('people') || designation.includes('hr');
    const isSales = dept.includes('market') || dept.includes('sales') || dept.includes('growth') || designation.includes('sales');
    const isFinance = dept.includes('finance') || dept.includes('account') || dept.includes('billing') || designation.includes('account');

    let category = 'general';
    let label = 'Productivity Focus';
    let icon = <Sparkles size={16} style={{ color: 'var(--color-primary, #d946ef)' }} />;

    if (isBpo) {
      category = 'bpo';
      label = 'Customer Experience';
      icon = <MessageSquare size={16} style={{ color: '#3b82f6' }} />;
    } else if (isTech) {
      category = 'tech';
      label = 'Tech & Software';
      icon = <Code size={16} style={{ color: '#8b5cf6' }} />;
    } else if (isHr) {
      category = 'hr';
      label = 'HR & Team Strategy';
      icon = <Users size={16} style={{ color: '#10b981' }} />;
    } else if (isSales) {
      category = 'sales';
      label = 'Sales & Marketing';
      icon = <LineChart size={16} style={{ color: '#f59e0b' }} />;
    } else if (isFinance) {
      category = 'finance';
      label = 'Finance & Accounts';
      icon = <DollarSign size={16} style={{ color: '#ef4444' }} />;
    }

    return { category, label, icon };
  }, [currentUser.department, currentUser.designation]);

  const fetchLiveDepartmentFact = async (signal) => {
    setLoading(true);
    try {
      const searchTerms = DEPT_SEARCH_TERMS[deptMeta.category];
      const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(randomTerm)}&format=json&origin=*`;
      const searchRes = await fetch(searchUrl, { signal });
      if (!searchRes.ok) throw new Error("Search request failed");
      const searchData = await searchRes.json();
      
      const hits = searchData?.query?.search || [];
      if (hits.length === 0) throw new Error("No wiki articles found");

      const chosenHit = hits[Math.floor(Math.random() * Math.min(hits.length, 5))];
      const title = chosenHit.title;

      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
      const summaryRes = await fetch(summaryUrl, { signal });
      if (!summaryRes.ok) throw new Error("Summary request failed");
      const summaryData = await summaryRes.json();

      if (summaryData.extract) {
        setFactData({
          title: summaryData.title,
          description: summaryData.description || 'Professional Terminology',
          extract: summaryData.extract,
          url: summaryData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`
        });
        setIsLive(true);
      } else {
        throw new Error("No summary extract found");
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn("Could not fetch live fact, using local fallback pool:", err);
        setIsLive(false);
        const fallbackPool = DEPT_FACTS[deptMeta.category];
        const randomIndex = Math.floor(Math.random() * fallbackPool.length);
        setFactData({
          title: deptMeta.label,
          description: 'Focus concept',
          extract: fallbackPool[randomIndex],
          url: ''
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchLiveDepartmentFact(controller.signal);
    return () => {
      controller.abort();
    };
  }, [deptMeta.category]);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }, []);

  return (
    <div className="flex-column gap-4 w-full mb-3">
      {/* 1. Page Greeting (Modern Multi-line Typography Dashboard Header) */}
      <div className="flex-row justify-between align-start flex-wrap gap-4 mt-2 mb-1">
        <div className="flex-column gap-1">
          {/* Top category/greeting tag */}
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: '700', 
            textTransform: 'uppercase', 
            letterSpacing: '1.2px', 
            color: 'var(--color-primary, #d946ef)' 
          }}>
            {timeOfDayGreeting}
          </span>
          
          {/* Employee Name (Big H1 Header) */}
          <h1 className="bold-text" style={{ 
            fontSize: '2.5rem', 
            fontWeight: '850',
            letterSpacing: '-1.2px',
            lineHeight: '1.1',
            background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--color-primary, #d946ef) 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent', 
            margin: '4px 0' 
          }}>
            {currentUser.name}
          </h1>

          {/* Subtitle containing Employee Metadata */}
          <div className="flex-row align-center gap-2 flex-wrap text-muted" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            <span>{currentUser.designation || 'Team Member'}</span>
            <span style={{ color: 'var(--border-color, rgba(255,255,255,0.15))' }}>•</span>
            <span>{currentUser.department || 'Operations'} Department</span>
          </div>
        </div>
        
        {/* Date Display Pill */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
          padding: '8px 16px',
          borderRadius: '30px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          alignSelf: 'flex-start',
          marginTop: '6px'
        }} className="date-pill">
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary, #d946ef)' }}></span>
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* 2. Professional Live Insight Card (Standard Dashboard Widget) */}
      <div className="dashboard-widget w-full">
        {/* Widget Header */}
        <div className="widget-header">
          <div className="flex-row align-center gap-2">
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-primary, #d946ef)' }}>
              {deptMeta.icon}
            </span>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {deptMeta.label} Insight {isLive ? '(Live Wikipedia Stream)' : '(Knowledge Base)'}
            </h3>
          </div>

          <button 
            onClick={() => fetchLiveDepartmentFact()} 
            disabled={loading}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.75rem', 
              padding: '6px 12px', 
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))', 
              borderRadius: '6px', 
              background: 'var(--bg-elevated, rgba(255, 255, 255, 0.02))',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            className="widget-action-btn"
            title="Fetch new live concept"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>New Insight</span>
          </button>
        </div>

        {/* Widget Content */}
        <div className="widget-content">
          {loading ? (
            <div className="flex-column gap-3 w-full">
              <div className="shimmer-bg" style={{ height: '18px', width: '250px', borderRadius: '4px' }}></div>
              <div className="shimmer-bg" style={{ height: '14px', width: '150px', borderRadius: '4px' }}></div>
              <div className="shimmer-bg" style={{ height: '16px', width: '100%', borderRadius: '4px', marginTop: '6px' }}></div>
              <div className="shimmer-bg" style={{ height: '16px', width: '85%', borderRadius: '4px' }}></div>
            </div>
          ) : (
            <div className="flex-row align-start gap-4 flex-wrap" style={{ flexFlow: 'row wrap' }}>
              {/* Fact Content Section */}
              <div className="flex-column gap-2" style={{ flex: '1 1 100%' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: '700', letterSpacing: '-0.2px' }}>
                  {factData.title}
                </h3>
                
                {factData.description && (
                  <span style={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'var(--color-primary, #d946ef)', fontWeight: '600' }}>
                    {factData.description}
                  </span>
                )}
                
                <p style={{ margin: '4px 0 12px 0', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {factData.extract}
                </p>

                {factData.url && (
                  <a 
                    href={factData.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="fact-read-more-link"
                    style={{ 
                      alignSelf: 'flex-start', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.78rem', 
                      color: 'var(--color-primary, #d946ef)', 
                      textDecoration: 'none',
                      fontWeight: '600',
                      padding: '6px 12px',
                      background: 'rgba(217, 70, 239, 0.06)',
                      borderRadius: '4px',
                      border: '1px solid rgba(217, 70, 239, 0.15)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(217, 70, 239, 0.12)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(217, 70, 239, 0.06)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <span>Read Full Wikipedia Article</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
