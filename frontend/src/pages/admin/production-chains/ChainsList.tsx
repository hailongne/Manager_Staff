import { useState, useEffect, useMemo } from "react";
import { getProductionChains, deleteProductionChain, getChainFeedbacks, sendFeedbackMessage, replyToFeedback, getChainKpis, getKpiCompletions, disableProductionChain, getDisabledProductionChains, enableProductionChain } from "../../../api/productionChains";
import type { ProductionChain, ProductionChainStep, ProductionChainFeedback } from "../../../api/productionChains";
import { useModalToast } from "../../../hooks/useToast";
import { useAuth } from "../../../hooks/useAuth";
import { KpiManagementSection } from "./components/KpiManagementSection";
import { EditChainBasicModal } from "./EditChainBasicModal";
import { CreateChainForm } from "./CreateChainForm";
import { TabNavigation } from "./components/TabNavigation";
import { FeedbackModal } from "./components/FeedbackModal";
import type { ChainKpi, KpiCompletionState } from "./types";

type TabType = "list" | "disabled" | "create";

export default function ProductionChainsList() {
  const { showSuccessToast, showErrorToast } = useModalToast();
  const { user, refreshUser } = useAuth();
  const [chains, setChains] = useState<ProductionChain[]>([]);
  const [disabledChains, setDisabledChains] = useState<ProductionChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [disabledLoading, setDisabledLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("list");
  const [selectedChain, setSelectedChain] = useState<ProductionChain | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbacks, setFeedbacks] = useState<ProductionChainFeedback[]>([]);
  const [newFeedbackMessage, setNewFeedbackMessage] = useState("");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");

  // Helper function to check if user is admin
  const isAdmin = user?.role === 'admin';
  const canCompleteKpi = user?.role === 'admin' || user?.role === 'leader';
  const canEditKpi = user?.role === 'admin' || user?.role === 'leader';

  // Filter chains based on user role and department
  const filteredChains = useMemo(() => {
    if (isAdmin) {
      // Admin sees all chains
      return chains.filter(chain =>
        chain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (chain.description && chain.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    } else if (user?.role === 'leader') {
      // Leader only sees chains where their department participates
      return chains.filter(chain => {
        const matchesSearch = chain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (chain.description && chain.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (!matchesSearch) return false;

        // Check if leader's department is in this chain
        if (!user.department_id) return false;
        
        const chainDepartmentIds = chain.steps?.map(step => step.department_id) || [];
        return chainDepartmentIds.includes(user.department_id);
      });
    }
    // Other users see no chains
    return [];
  }, [chains, searchTerm, isAdmin, user]);

  const filteredDisabledChains = useMemo(() => {
    if (isAdmin) {
      // Admin sees all disabled chains
      return disabledChains.filter(chain =>
        chain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (chain.description && chain.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    } else if (user?.role === 'leader') {
      // Leader only sees disabled chains where their department participates
      return disabledChains.filter(chain => {
        const matchesSearch = chain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (chain.description && chain.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (!matchesSearch) return false;

        // Check if leader's department is in this chain
        if (!user.department_id) return false;
        
        const chainDepartmentIds = chain.steps?.map(step => step.department_id) || [];
        return chainDepartmentIds.includes(user.department_id);
      });
    }
    // Other users see no chains
    return [];
  }, [disabledChains, searchTerm, isAdmin, user]);

  // KPI related state
  const [chainKpis, setChainKpis] = useState<ChainKpi[]>([]);
  const [kpiCompletionState, setKpiCompletionState] = useState<KpiCompletionState>({});

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChain, setEditingChain] = useState<ProductionChain | null>(null);

  console.log('ChainsList user:', user);
  console.log('ChainsList userRole:', user?.role);

  // Helper function to check if user is manager
  const isManager = () => {
    if (user?.role === 'admin' || user?.role === 'leader') return true;
    if (!user?.department_position) return false;

    const managerKeywords = [
      'truong ban',
      'truong phong',
      'truong bo phan',
      'truong nhom',
      'nhom truong',
      'head',
      'manager',
      'director'
    ];

    const normalized = user.department_position
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return managerKeywords.some(keyword => normalized.includes(keyword));
  };

  useEffect(() => {
    loadChains();
  }, []);

  // Ensure user is loaded
  useEffect(() => {
    if (!user) {
      refreshUser();
    }
  }, [user, refreshUser]);

  // Load KPIs when a chain is selected for details
  useEffect(() => {
    if (selectedChain?.chain_id) {
      loadChainKpis(selectedChain.chain_id);
    }
  }, [selectedChain]);

  const loadChains = async () => {
    try {
      const data = await getProductionChains();
      setChains(data);
      
      // Load KPIs for all chains
      if (data.length > 0) {
        const kpiPromises = data.map(chain => 
          chain.chain_id ? getChainKpis(chain.chain_id).catch(() => []) : Promise.resolve([])
        );
        const kpiResults = await Promise.all(kpiPromises);
        const allKpis = kpiResults.flat();
        setChainKpis(allKpis);
        
        // Load completion states for all KPIs
        const completionState: KpiCompletionState = {};
        for (const kpi of allKpis) {
          try {
            const completions = await getKpiCompletions(kpi.chain_kpi_id);
            const key = `${kpi.chain_id}-${kpi.year}-${kpi.month}`;
            
            const weeks: number[] = [];
            const days: string[] = [];
            
            completions.forEach(completion => {
              if (completion.completion_type === 'week' && completion.week_index !== undefined) {
                weeks.push(completion.week_index);
              } else if (completion.completion_type === 'day' && completion.date_iso) {
                days.push(completion.date_iso);
              }
            });
            
            completionState[key] = { chain_id: kpi.chain_id, weeks, days };
          } catch (error) {
            console.error(`Lỗi tải completions cho KPI ${kpi.chain_kpi_id}:`, error);
          }
        }
        setKpiCompletionState(completionState);
      }
    } catch (error) {
      console.error("Lỗi tải chuỗi sản xuất:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDisabledChains = async () => {
    try {
      setDisabledLoading(true);
      const data = await getDisabledProductionChains();
      setDisabledChains(data);
    } catch (error) {
      console.error("Lỗi tải chuỗi sản xuất đã vô hiệu hóa:", error);
      showErrorToast("Không thể tải danh sách chuỗi đã vô hiệu hóa");
    } finally {
      setDisabledLoading(false);
    }
  };

  const loadChainKpis = async (chainId: number) => {
    try {
      const kpis = await getChainKpis(chainId);
      setChainKpis(kpis);
    } catch (error) {
      console.error("Lỗi tải KPIs:", error);
    }
  };

  const handleEditChain = (chain: ProductionChain) => {
    setEditingChain(chain);
    setShowEditModal(true);
  };

  const handleKpiCompletionUpdate = async () => {
    // Reload kpiCompletionState for all chains
    try {
      const completionState: KpiCompletionState = {};
      
      for (const kpi of chainKpis) {
        try {
          const completions = await getKpiCompletions(kpi.chain_kpi_id);
          
          const weeks = completions
            .filter(c => c.completion_type === 'week')
            .map(c => c.week_index)
            .filter(Boolean) as number[];
          
          const days = completions
            .filter(c => c.completion_type === 'day')
            .map(c => c.date_iso)
            .filter(Boolean) as string[];
          
          const key = `${kpi.chain_id}-${kpi.year}-${kpi.month}`;
          completionState[key] = { chain_id: kpi.chain_id, weeks, days };
        } catch (error) {
          console.error(`Lỗi tải completions cho KPI ${kpi.chain_kpi_id}:`, error);
        }
      }
      setKpiCompletionState(completionState);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái hoàn thành KPI:", error);
    }
  };



  const handleKpiUpdate = async (updatedKpi?: ChainKpi) => {
    if (updatedKpi) {
      // Update the specific KPI in state immediately
      console.log('Updating KPI in state:', updatedKpi);
      setChainKpis(prevKpis =>
        prevKpis.map(kpi =>
          kpi.chain_kpi_id === updatedKpi.chain_kpi_id ? updatedKpi : kpi
        )
      );
      return;
    }

    // Fallback: Reload all KPIs
    try {
      const data = await getProductionChains();
      setChains(data);

      // Load KPIs for all chains
      if (data.length > 0) {
        const kpiPromises = data.map(chain =>
          chain.chain_id ? getChainKpis(chain.chain_id).catch(() => []) : Promise.resolve([])
        );
        const kpiResults = await Promise.all(kpiPromises);
        const allKpis = kpiResults.flat();
        setChainKpis(allKpis);

        // Also reload completion states
        await handleKpiCompletionUpdate();
      }
    } catch (error) {
      console.error("Lỗi tải KPIs:", error);
    }
  };

  const handleDeleteChain = async (chain: ProductionChain) => {
    if (!chain.chain_id) return;

    let hasCompletions = false;

    try {
      // Check if chain has KPI completions
      const chainKpis = await getChainKpis(chain.chain_id);

      if (chainKpis.length > 0) {
        const completionPromises = chainKpis.map(kpi => getKpiCompletions(kpi.chain_kpi_id));
        const completionsResults = await Promise.all(completionPromises);
        hasCompletions = completionsResults.some(completions => completions.length > 0);
      }

      if (hasCompletions) {
        // Chain has activity - offer to disable instead of delete
        const confirmDisable = window.confirm(
          `Chuỗi "${chain.name}" đã có dữ liệu hoàn thành KPI.\n\nBạn có muốn vô hiệu hóa chuỗi này thay vì xóa?`
        );

        if (!confirmDisable) return;

        await disableProductionChain(chain.chain_id);
        showSuccessToast("Vô hiệu hóa chuỗi sản xuất thành công!");
      } else {
        // Chain has no activity - allow full deletion
        const confirmDelete = window.confirm(
          `Bạn có chắc chắn muốn xóa chuỗi "${chain.name}"?\n\nHành động này không thể hoàn tác.`
        );

        if (!confirmDelete) return;

        await deleteProductionChain(chain.chain_id);
        showSuccessToast("Xóa chuỗi sản xuất thành công!");
      }

      loadChains(); // Reload danh sách
    } catch (error: unknown) {
      console.error("Lỗi xử lý chuỗi:", error);
      let errorMessage = hasCompletions ? "Lỗi vô hiệu hóa chuỗi sản xuất" : "Lỗi xóa chuỗi sản xuất";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      showErrorToast(errorMessage);
    }
  };

  const handleEnableChain = async (chain: ProductionChain) => {
    if (!chain.chain_id) return;

    try {
      const confirmEnable = window.confirm(
        `Bạn có chắc chắn muốn kích hoạt lại chuỗi "${chain.name}"?`
      );

      if (!confirmEnable) return;

      await enableProductionChain(chain.chain_id);
      showSuccessToast("Kích hoạt lại chuỗi sản xuất thành công!");
      
      // Reload both lists
      loadChains();
      loadDisabledChains();
    } catch (error: unknown) {
      console.error("Lỗi kích hoạt lại chuỗi:", error);
      let errorMessage = "Lỗi kích hoạt lại chuỗi sản xuất";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      showErrorToast(errorMessage);
    }
  };

  const handleAddFeedback = async (chain: ProductionChain) => {
    if (!chain.chain_id) return;

    setSelectedChain(chain);
    setShowFeedbackModal(true);

    // Load existing feedbacks
    try {
      const feedbackData = await getChainFeedbacks(chain.chain_id);
      setFeedbacks(feedbackData);
    } catch (error) {
      console.error("Lỗi tải phản hồi:", error);
    }
  };

  const handleSendFeedback = async () => {
    if (!selectedChain?.chain_id || !newFeedbackMessage.trim()) return;

    try {
      if (isAdmin) {
        await replyToFeedback(selectedChain.chain_id, newFeedbackMessage.trim());
      } else {
        await sendFeedbackMessage(selectedChain.chain_id, newFeedbackMessage.trim());
      }

      showSuccessToast("Gửi phản hồi thành công!");
      setNewFeedbackMessage("");

      // Reload feedbacks
      const feedbackData = await getChainFeedbacks(selectedChain.chain_id);
      setFeedbacks(feedbackData);
    } catch (error: unknown) {
      console.error("Lỗi gửi phản hồi:", error);
      let errorMessage = "Lỗi gửi phản hồi";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      showErrorToast(errorMessage);
    }
  };

  const handleCloseFeedbackModal = () => {
    setShowFeedbackModal(false);
    setSelectedChain(null);
    setFeedbacks([]);
    setNewFeedbackMessage("");
  };

  const handleTabChange = (tab: TabType, loadDisabled = false) => {
    setActiveTab(tab);
    if (loadDisabled) {
      loadDisabledChains();
    }
  };

  if (loading) {
    return (
      <div className="w-full px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Quản Lý Chuỗi Sản Xuất</h1>
        <p className="mt-2 text-sm text-gray-600">
          Tạo và quản lý các chuỗi quy trình sản xuất với nhiều phòng ban tham gia.
        </p>
      </header>

      {/* Tabs */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        chainsCount={filteredChains.length}
        disabledChainsCount={filteredDisabledChains.length}
        isAdmin={isAdmin}
      />

      {/* Filters */}
      {(activeTab === "list" || activeTab === "disabled") && (
        <div className="p-1 flex flex-wrap items-center gap-1">
          <div className="flex items-center gap-1">
            <div className="relative">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo tên chuỗi..."
                className="pl-2 pr-2 py-2 text-sm rounded-full bg-pink-50 border border-pink-200 text-gray-700 placeholder-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "list" && (
        <div className="space-y-4">
          {filteredChains.map((chain) => (
            <div key={chain.chain_id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">{chain.name}</h2>
                  <p className="text-gray-600 mt-1">{chain.description}</p>
                </div>
                <div className="flex gap-3 ml-4">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleEditChain(chain)}
                        className="inline-flex items-center gap-2 px-2 py-2 rounded-lg text-yellow-600 hover:text-yellow-500"
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        onClick={() => handleDeleteChain(chain)}
                        className="inline-flex items-center gap-2 px-2 py-2 rounded-lg text-red-600 hover:text-red-500"
                      >
                        Xóa chuỗi
                      </button>
                    </>
                  )}
                  {isManager() && !isAdmin && (
                    <button
                      onClick={() => handleAddFeedback(chain)}
                      className="inline-flex items-center gap-2 px-2 py-2 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-100"
                    >
                      💬 Phản hồi
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {chain.steps?.sort((a, b) => a.step_order - b.step_order).map((step: ProductionChainStep, index: number) => (
                    <div key={step.step_id} className="flex items-center">
                      <div className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium text-center">
                        {step.step_order}. {step.department?.name}
                        <p className="text-xs text-gray-500">
                          {step.title}
                        </p>
                      </div>
                      {index < chain.steps.length - 1 && (
                        <span className="mx-3 text-gray-400 text-5xl">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback Section */}
              {/* KPI Section */}
              {(() => {
                const chainKpisForThisChain = chainKpis.filter(kpi => kpi.chain_id === chain.chain_id && kpi.chain_id != null);
                const latestKpi = chainKpisForThisChain.length > 0 ? chainKpisForThisChain.reduce((latest, current) => {
                  const latestDate = new Date(latest.year, latest.month - 1);
                  const currentDate = new Date(current.year, current.month - 1);
                  return currentDate > latestDate ? current : latest;
                }) : null;
                
                return (
                  <KpiManagementSection
                    productionChain={chain}
                    selectedKpi={latestKpi}
                    latestKpi={latestKpi}
                    hasKpis={chainKpisForThisChain.length > 0}
                    kpiSummaryMonth={latestKpi?.month || new Date().getMonth() + 1}
                    kpiSummaryYear={latestKpi?.year || new Date().getFullYear()}
                    canCompleteKpi={canCompleteKpi}
                    canEditKpi={canEditKpi}
                    userRole={user?.role}
                    chainKpis={chainKpisForThisChain}
                    onKpiCompletionUpdate={handleKpiCompletionUpdate}
                    onKpiUpdate={handleKpiUpdate}
                  />
                );
              })()}

            </div>
          ))}

          {filteredChains.length === 0 && (
            <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {chains.length === 0 ? "Chưa có chuỗi sản xuất nào" : "Không tìm thấy chuỗi nào phù hợp"}
              </h3>
              <p className="text-gray-500 mb-4">
                {chains.length === 0 ? "Hãy tạo chuỗi sản xuất đầu tiên để bắt đầu quản lý quy trình." : "Hãy thử điều chỉnh bộ lọc."}
              </p>
              {chains.length === 0 && isAdmin && (
                <button
                  onClick={() => setActiveTab("create")}
                  className="inline-flex items-center gap-2 px-2 py-2 rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-100"
                >
                  Tạo Chuỗi Đầu Tiên
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Disabled Chains Tab */}
      {activeTab === "disabled" && (
        <div className="space-y-4">
          {disabledLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              <p className="mt-2 text-gray-600">Đang tải...</p>
            </div>
          ) : filteredDisabledChains.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Không có chuỗi sản xuất nào đã vô hiệu hóa</p>
            </div>
          ) : (
            filteredDisabledChains.map((chain) => (
              <div key={chain.chain_id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">{chain.name}</h2>
                    <p className="text-gray-600 mt-1">{chain.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Đã vô hiệu hóa
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 ml-4">
                    {isAdmin && (
                      <button
                        onClick={() => handleEnableChain(chain)}
                        className="inline-flex items-center text-green-600 px-3 py-2 text-sm leading-4 font-medium rounded-md hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Kích hoạt lại
                      </button>
                    )}
                  </div>
                </div>

                {/* Chain Steps */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Các bước thực hiện:</h3>
                  <div className="flex flex-wrap gap-2">
                    {chain.steps?.sort((a, b) => a.step_order - b.step_order).map((step: ProductionChainStep, index: number) => (
                      <div key={step.step_id || index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                        <span className="font-medium mr-1">{step.step_order}.</span>
                        {step.title}
                        {step.department && (
                          <span className="ml-2 text-xs text-gray-600">({step.department.name})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chain Info */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span>Tạo bởi: {chain.creator?.name || 'N/A'}</span>
                  </div>
                  <span>{new Date(chain.created_at || '').toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Chain Tab */}
      {activeTab === "create" && (
        <div className="p-6">
          <CreateChainForm onChainCreated={loadChains} />
        </div>
      )}



      {/* Edit Chain Modal */}
      <EditChainBasicModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingChain(null);
        }}
        onSuccess={() => {
          loadChains();
          setShowEditModal(false);
          setEditingChain(null);
        }}
        chain={editingChain}
        kpiCompletionState={kpiCompletionState}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        chain={selectedChain}
        feedbacks={feedbacks}
        onClose={handleCloseFeedbackModal}
        onSendMessage={handleSendFeedback}
        isAdmin={isAdmin}
      />

    </div>
  );
}