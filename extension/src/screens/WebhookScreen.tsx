import React, { useState, useEffect } from "react";
import { styles } from "./styles";

interface WebhookScreenProps {
  onBack: () => void;
}

interface WebhookConfig {
  id?: string;
  description: string;
  protocol: string;
  network: string;
  eventType: string;
  webhookUrl: string;
  addresses?: string[];
  isActive: boolean;
}

export const WebhookScreen: React.FC<WebhookScreenProps> = ({ onBack }) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState<WebhookConfig>({
    description: "",
    protocol: "ethereum",
    network: "mainnet",
    eventType: "BLOCK_PERIOD",
    webhookUrl: "",
    addresses: [],
    isActive: true,
  });

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      const result = await chrome.storage.local.get(["webhooks"]);
      setWebhooks(result.webhooks || []);
    } catch (err) {
      setError("웹훅 목록을 불러오는데 실패했습니다.");
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newWebhook.description || !newWebhook.webhookUrl) {
      setError("설명과 웹훅 URL은 필수 입력 항목입니다.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await chrome.storage.local.get(["apiKey"]);
      const apiKey = result.apiKey;

      if (!apiKey) {
        setError(
          "API Key가 설정되지 않았습니다. 설정에서 API Key를 입력해주세요."
        );
        return;
      }

      // Nodit Webhook API 호출
      const webhookData = {
        description: newWebhook.description,
        protocol: newWebhook.protocol.toUpperCase(),
        network: newWebhook.network.toUpperCase(),
        subscriptionType: "WEBHOOK",
        eventType: newWebhook.eventType,
        notification: {
          webhookUrl: newWebhook.webhookUrl,
        },
        condition: {
          period: 1,
          ...(newWebhook.addresses &&
            newWebhook.addresses.length > 0 && {
              addresses: newWebhook.addresses,
            }),
        },
      };

      const response = await fetch(
        `https://web3.nodit.io/v1/${newWebhook.protocol}/${newWebhook.network}/webhooks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": apiKey,
            accept: "application/json",
          },
          body: JSON.stringify(webhookData),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`웹훅 생성 실패: ${response.status} - ${errorData}`);
      }

      const createdWebhook = await response.json();

      // 로컬 스토리지에 저장
      const updatedWebhooks = [
        ...webhooks,
        { ...newWebhook, id: createdWebhook.subscriptionId },
      ];
      await chrome.storage.local.set({ webhooks: updatedWebhooks });

      setWebhooks(updatedWebhooks);
      setNewWebhook({
        description: "",
        protocol: "ethereum",
        network: "mainnet",
        eventType: "BLOCK_PERIOD",
        webhookUrl: "",
        addresses: [],
        isActive: true,
      });

      alert("웹훅이 성공적으로 생성되었습니다!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "웹훅 생성에 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWebhook = async (webhook: WebhookConfig) => {
    if (!confirm("정말로 이 웹훅을 삭제하시겠습니까?")) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await chrome.storage.local.get(["apiKey"]);
      const apiKey = result.apiKey;

      if (!apiKey) {
        setError("API Key가 설정되지 않았습니다.");
        return;
      }

      if (webhook.id) {
        // Nodit API에서 삭제
        const response = await fetch(
          `https://web3.nodit.io/v1/${webhook.protocol}/${webhook.network}/webhooks/${webhook.id}`,
          {
            method: "DELETE",
            headers: {
              "X-API-KEY": apiKey,
              accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("웹훅 삭제에 실패했습니다.");
        }
      }

      // 로컬 스토리지에서 삭제
      const updatedWebhooks = webhooks.filter((w) => w.id !== webhook.id);
      await chrome.storage.local.set({ webhooks: updatedWebhooks });
      setWebhooks(updatedWebhooks);

      alert("웹훅이 삭제되었습니다.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "웹훅 삭제에 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressChange = (value: string) => {
    const addresses = value
      .split(",")
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);
    setNewWebhook((prev) => ({ ...prev, addresses }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12H5"
              stroke="#374151"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 19L5 12L12 5"
              stroke="#374151"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 style={styles.title}>웹훅 설정</h2>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleCreateWebhook} style={styles.form}>
        <div style={styles.formGroup}>
          <label htmlFor="description" style={styles.label}>
            설명 *
          </label>
          <input
            type="text"
            id="description"
            value={newWebhook.description}
            onChange={(e) =>
              setNewWebhook((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            style={styles.input}
            placeholder="웹훅에 대한 설명을 입력하세요"
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="protocol" style={styles.label}>
            프로토콜
          </label>
          <select
            id="protocol"
            value={newWebhook.protocol}
            onChange={(e) =>
              setNewWebhook((prev) => ({ ...prev, protocol: e.target.value }))
            }
            style={styles.input}
          >
            <option value="ethereum">Ethereum</option>
            <option value="polygon">Polygon</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="base">Base</option>
            <option value="optimism">Optimism</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="network" style={styles.label}>
            네트워크
          </label>
          <select
            id="network"
            value={newWebhook.network}
            onChange={(e) =>
              setNewWebhook((prev) => ({ ...prev, network: e.target.value }))
            }
            style={styles.input}
          >
            <option value="mainnet">Mainnet</option>
            <option value="testnet">Testnet</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="eventType" style={styles.label}>
            이벤트 타입
          </label>
          <select
            id="eventType"
            value={newWebhook.eventType}
            onChange={(e) =>
              setNewWebhook((prev) => ({ ...prev, eventType: e.target.value }))
            }
            style={styles.input}
          >
            <option value="BLOCK_PERIOD">블록 주기</option>
            <option value="TRANSACTION">트랜잭션</option>
            <option value="ADDRESS_ACTIVITY">주소 활동</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="addresses" style={styles.label}>
            모니터링 주소 (선택사항)
          </label>
          <input
            type="text"
            id="addresses"
            value={newWebhook.addresses?.join(", ") || ""}
            onChange={(e) => handleAddressChange(e.target.value)}
            style={styles.input}
            placeholder="주소를 쉼표로 구분하여 입력 (예: 0x123..., 0x456...)"
          />
          <div>
            특정 주소의 활동만 모니터링하려면 주소를 입력하세요. 비워두면 모든
            활동을 모니터링합니다.
          </div>
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="webhookUrl" style={styles.label}>
            웹훅 URL *
          </label>
          <input
            type="url"
            id="webhookUrl"
            value={newWebhook.webhookUrl}
            onChange={(e) =>
              setNewWebhook((prev) => ({ ...prev, webhookUrl: e.target.value }))
            }
            style={styles.input}
            placeholder="https://your-webhook-endpoint.com"
            required
          />
        </div>

        <button type="submit" style={styles.button} disabled={isLoading}>
          {isLoading ? "생성 중..." : "웹훅 생성"}
        </button>
      </form>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>등록된 웹훅</h3>
        {webhooks.length === 0 ? (
          <div>등록된 웹훅이 없습니다.</div>
        ) : (
          <div>
            {webhooks.map((webhook, index) => (
              <div key={webhook.id || index} style={styles.listItem}>
                <div style={styles.listItemContent}>
                  <h4 style={styles.listItemTitle}>{webhook.description}</h4>
                  <p style={styles.listItemSubtitle}>
                    {webhook.protocol.toUpperCase()} -{" "}
                    {webhook.network.toUpperCase()}
                  </p>
                  <p style={styles.listItemSubtitle}>{webhook.webhookUrl}</p>
                  <p style={styles.listItemMeta}>
                    이벤트: {webhook.eventType} | 상태:{" "}
                    {webhook.isActive ? "활성" : "비활성"}
                  </p>
                  {webhook.addresses && webhook.addresses.length > 0 && (
                    <p style={styles.listItemMeta}>
                      모니터링 주소: {webhook.addresses.slice(0, 2).join(", ")}
                      {webhook.addresses.length > 2 &&
                        ` 외 ${webhook.addresses.length - 2}개`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteWebhook(webhook)}
                  style={styles.deleteButton}
                  disabled={isLoading}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
