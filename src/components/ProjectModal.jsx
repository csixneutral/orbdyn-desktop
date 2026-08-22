import React, { useState, useEffect } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  ColorInput,
  Button,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Paper,
  SegmentedControl,
  ActionIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconFolder,
  IconTrash,
  IconPencil,
  IconPlus,
  IconUser,
  IconCalendar,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { api } from "../api";
import { useData } from "../context/DataContext";

export function ProjectModal({ project, opened, onClose }) {
  const { users, refresh } = useData();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [client, setClient] = useState("");
  const [colour, setColour] = useState("#3d7fe0");
  const [visibility, setVisibility] = useState("everyone");
  const [memberIds, setMemberIds] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setClient(project.client || "");
      setColour(project.colour || "#3d7fe0");
      setVisibility(project.visibility || "everyone");
      setMemberIds(project.memberIds || []);
      setDueDate(project.dueDate || "");
    } else {
      setName("");
      setDescription("");
      setClient("");
      setColour("#3d7fe0");
      setVisibility("everyone");
      setMemberIds([]);
      setDueDate("");
    }
  }, [project, opened]);

  const handleSave = async () => {
    if (!name.trim()) {
      notifications.show({
        title: "Error",
        message: "Project name is required",
        color: "red",
      });
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        name,
        description,
        client,
        colour,
        visibility,
        memberIds,
        dueDate,
      };

      if (project?.id) {
        await api.updateProject(project.id, payload);
        notifications.show({
          title: "Success",
          message: "Project updated",
          color: "green",
        });
      } else {
        await api.createProject(payload);
        notifications.show({
          title: "Success",
          message: "Project created",
          color: "green",
        });
      }
      refresh();
      onClose();
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const [deleteConfirmOpened, setDeleteConfirmOpened] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!project?.id) return;
    try {
      setDeleting(true);
      await api.deleteProject(project.id);
      notifications.show({
        title: "Moved to Recycle Bin",
        message: `"${project.name}" was moved to the Recycle Bin.`,
        color: "blue",
      });
      setDeleteConfirmOpened(false);
      onClose();
      refresh();
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      centered
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size={36} radius="md" color="blue" variant="light">
            <IconFolder size={22} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="lg">
              {project ? "Edit Project" : "New Project"}
            </Text>
            <Text size="xs" c="dimmed">
              {project
                ? "Modify details and member access"
                : "Organize tasks and shared documents"}
            </Text>
          </div>
        </Group>
      }
      size={620}
      radius="lg"
      overlayProps={{ backgroundOpacity: 0.6, blur: 4 }}
      padding="xl"
    >
      <Stack gap="md" mt="xs">
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
        >
          <Stack gap="sm">
            <TextInput
              label="Project Name"
              placeholder="e.g. Website Redesign"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
              variant="filled"
              size="sm"
            />

            <Textarea
              label="Description"
              placeholder="What is this project about?"
              minRows={2}
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              variant="filled"
              size="sm"
            />
          </Stack>
        </Paper>

        <Paper
          p="md"
          radius="md"
          withBorder
          style={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
        >
          <Stack gap="sm">
            <TextInput
              label="Client Name"
              placeholder="e.g. Internal / Acme Corp"
              value={client}
              onChange={(e) => setClient(e.currentTarget.value)}
              variant="filled"
              size="sm"
            />

            <div>
              <Text size="xs" fw={600} mb={6} c="dimmed">
                PROJECT COLOR ACCENT
              </Text>
              <Group gap="xs" mb="xs">
                {[
                  "#3d7fe0",
                  "#5b8def",
                  "#10b981",
                  "#f59e0b",
                  "#ef4444",
                  "#8b5cf6",
                  "#ec4899",
                ].map((hex) => (
                  <ActionIcon
                    key={hex}
                    size="lg"
                    radius="xl"
                    style={{
                      backgroundColor: hex,
                      border:
                        colour.toLowerCase() === hex.toLowerCase()
                          ? "2.5px solid white"
                          : "1px solid rgba(255, 255, 255, 0.1)",
                      boxShadow:
                        colour.toLowerCase() === hex.toLowerCase()
                          ? `0 0 8px ${hex}`
                          : "none",
                      cursor: "pointer",
                    }}
                    onClick={() => setColour(hex)}
                  >
                    {colour.toLowerCase() === hex.toLowerCase() && (
                      <IconCheck size={16} color="white" />
                    )}
                  </ActionIcon>
                ))}
              </Group>

              <ColorInput
                label="Custom Color Hex"
                placeholder="Or custom hex code e.g. #3d7fe0"
                value={colour}
                onChange={setColour}
                format="hex"
                variant="filled"
                size="sm"
                swatches={[
                  "#3d7fe0",
                  "#5b8def",
                  "#10b981",
                  "#f59e0b",
                  "#ef4444",
                  "#8b5cf6",
                  "#ec4899",
                ]}
              />
            </div>
          </Stack>
        </Paper>

        <Paper
          p="md"
          radius="md"
          withBorder
          style={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
        >
          <Stack gap="sm">
            <div>
              <Text size="xs" fw={600} mb={6} c="dimmed">
                VISIBILITY PERMISSIONS
              </Text>
              <SegmentedControl
                fullWidth
                size="xs"
                radius="md"
                color="blue"
                value={visibility}
                onChange={setVisibility}
                data={[
                  { label: "Everyone in Workspace", value: "everyone" },
                  { label: "Team Members Only", value: "members" },
                ]}
              />
            </div>

            <TextInput
              label="Target Due Date"
              type="date"
              leftSection={<IconCalendar size={16} color="#8b5cf6" />}
              value={dueDate}
              onChange={(e) => setDueDate(e.currentTarget.value)}
              variant="filled"
              size="sm"
            />

            <div>
              <Group justify="space-between" mb={2}>
                <Group gap={6}>
                  <IconUser size={14} color="#10b981" />
                  <Text size="xs" fw={600}>
                    Team Members
                  </Text>
                </Group>
                <Text size="10px" c="dimmed">
                  Project Owner is automatically included
                </Text>
              </Group>
              <MultiSelect
                data={users.map((u) => ({ value: u.id, label: u.name }))}
                value={memberIds}
                onChange={setMemberIds}
                placeholder="Select additional team members"
                searchable
                clearable
                hidePickedOptions
                variant="filled"
                size="sm"
                styles={{
                  pill: {
                    backgroundColor: "rgba(16, 185, 129, 0.18)",
                    color: "#34d399",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    fontWeight: 600,
                  },
                }}
              />
            </div>
          </Stack>
        </Paper>

        <Group justify="space-between" mt="sm">
          {project?.id ? (
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={16} />}
              onClick={() => setDeleteConfirmOpened(true)}
              radius="md"
            >
              Delete
            </Button>
          ) : (
            <div />
          )}

          <Group gap="xs">
            <Button variant="subtle" color="gray" onClick={onClose} radius="md">
              Cancel
            </Button>
            <Button
              color="blue"
              onClick={handleSave}
              loading={submitting}
              radius="md"
              leftSection={
                project ? <IconPencil size={16} /> : <IconPlus size={16} />
              }
              size="sm"
            >
              {project ? "Save Changes" : "Create Project"}
            </Button>
          </Group>
        </Group>
      </Stack>

      {/* Delete Project Confirmation Modal */}
      <Modal
        centered
        opened={deleteConfirmOpened}
        onClose={() => setDeleteConfirmOpened(false)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={20} color="#ef4444" />
            <Text fw={700}>Delete Project?</Text>
          </Group>
        }
        size={520}
        radius="lg"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete <strong>"{project?.name}"</strong>? It will be moved to the Recycle Bin where you can restore it or delete it permanently.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteConfirmOpened(false)}>
              Cancel
            </Button>
            <Button color="red" loading={deleting} onClick={handleConfirmDelete}>
              Delete Project
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Modal>
  );
}
