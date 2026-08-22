import React, { useState, useEffect } from "react";
import {
  Paper,
  Title,
  Text,
  Group,
  Button,
  Stack,
  Badge,
  Progress,
  Avatar,
  ActionIcon,
  Textarea,
  FileInput,
  Modal,
  Table,
  Card,
  Tooltip,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconPencil,
  IconPlus,
  IconPaperclip,
  IconSend,
  IconFileText,
  IconDownload,
  IconEye,
  IconTrash,
  IconLink,
  IconUser,
  IconCalendar,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { api } from "../api";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { ProjectModal } from "../components/ProjectModal";
import { TaskModal } from "../components/TaskModal";
import { TaskDetailView } from "./TaskDetailView";

export function ProjectDetailView({ projectId, onBack }) {
  const { user } = useAuth();
  const { users, refresh } = useData();

  const [project, setProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [projectFiles, setProjectFiles] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [editProjectOpened, setEditProjectOpened] = useState(false);
  const [createTaskOpened, setCreateTaskOpened] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);

  const [uploadModalOpened, setUploadModalOpened] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const [deleteProjectModalOpened, setDeleteProjectModalOpened] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const handleConfirmDeleteProject = async () => {
    try {
      setDeletingProject(true);
      await api.deleteProject(project.id);
      notifications.show({ title: 'Moved to Recycle Bin', message: `"${project.name}" was moved to the Recycle Bin.`, color: 'blue' });
      onBack();
      refresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setDeletingProject(false);
    }
  };

  const loadDetails = async () => {
    if (!projectId) return;
    try {
      const { projects } = await api.getProjects();
      const p = projects.find((item) => item.id === projectId);
      if (p) {
        setProject(p);
      }
      const { tasks } = await api.getTasks({ projectId });
      setProjectTasks(tasks || []);

      const { files } = await api.getFiles({ projectId });
      setProjectFiles(files || []);

      const { comments: cList } = await api.getComments({ projectId });
      setComments((cList || []).filter((c) => !c.taskId));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [projectId]);

  if (activeTaskId) {
    return (
      <TaskDetailView
        taskId={activeTaskId}
        onBack={() => {
          setActiveTaskId(null);
          loadDetails();
        }}
      />
    );
  }

  if (!project) {
    return (
      <Stack gap="md">
        <Button
          leftSection={<IconArrowLeft size={16} />}
          variant="subtle"
          color="gray"
          onClick={onBack}
          style={{ width: "fit-content" }}
        >
          All projects
        </Button>
        <Text c="dimmed">Loading project details...</Text>
      </Stack>
    );
  }

  const owner = users.find((u) => u.id === project.ownerId);
  const teamMembers = users.filter(
    (u) => (project.memberIds || []).includes(u.id) || u.id === project.ownerId,
  );
  const doneCount = projectTasks.filter((t) => t.status === "done").length;
  const progressPercent = projectTasks.length
    ? Math.round(
        projectTasks.reduce(
          (a, t) => a + (t.status === "done" ? 100 : t.progress),
          0,
        ) / projectTasks.length,
      )
    : 0;

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.createComment({
        projectId: project.id,
        body: newComment,
      });
      setComments((prev) => [...prev, res.comment]);
      setNewComment("");
      refresh();
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("projectId", project.id);
      for (const f of selectedFiles) {
        formData.append("files", f);
      }

      await api.uploadFiles(formData);
      notifications.show({
        title: "Success",
        message: "Document shared in project",
        color: "green",
      });
      setSelectedFiles([]);
      setUploadModalOpened(false);
      loadDetails();
      refresh();
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fId) => {
    if (!window.confirm("Delete this document from project?")) return;
    try {
      await api.deleteFile(fId);
      notifications.show({
        title: "Removed",
        message: "Document moved to _removed folder",
        color: "blue",
      });
      loadDetails();
      refresh();
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    }
  };

  const handleCopyLink = (f) => {
    const fullUrl = `${window.location.origin}/api/files/${f.id}/download`;
    navigator.clipboard.writeText(fullUrl);
    notifications.show({
      title: "Copied!",
      message: "Download link copied to clipboard",
      color: "blue",
    });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Button
          leftSection={<IconArrowLeft size={16} />}
          variant="subtle"
          color="gray"
          onClick={onBack}
          size="sm"
        >
          All projects
        </Button>

        <Group gap="xs">
          {(user?.role === "admin" || project.ownerId === user?.id) && (
            <>
              <Button
                leftSection={<IconPencil size={16} />}
                variant="default"
                size="sm"
                onClick={() => setEditProjectOpened(true)}
              >
                Edit
              </Button>
              <Button
                leftSection={<IconTrash size={16} />}
                color="red"
                variant="light"
                size="sm"
                onClick={() => setDeleteProjectModalOpened(true)}
              >
                Delete
              </Button>
            </>
          )}
          {user?.role !== "viewer" && (
            <Button
              leftSection={<IconPlus size={16} />}
              color="blue"
              size="sm"
              onClick={() => setCreateTaskOpened(true)}
            >
              New Task
            </Button>
          )}
        </Group>
      </Group>

      {/* Main Project Header Card */}
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="md">
          <Group gap="xs">
            <Badge color={project.colour || "blue"} variant="filled" size="lg">
              {project.name}
            </Badge>
          </Group>

          {project.description && (
            <Text size="sm" c="dimmed">
              {project.description}
            </Text>
          )}

          <Group gap="xl" wrap="wrap" mt="xs">
            <div>
              <Text size="xs" c="dimmed" fw={600} mb={4}>
                Owner
              </Text>
              <Group gap={6}>
                <Avatar size="xs" radius="xl" color={owner?.color || "blue"}>
                  {owner?.name ? owner.name[0].toUpperCase() : "?"}
                </Avatar>
                <Text size="sm" fw={600}>
                  {owner?.name || "Unknown"}
                </Text>
              </Group>
            </div>

            {project.client && (
              <div>
                <Text size="xs" c="dimmed" fw={600} mb={4}>
                  Client
                </Text>
                <Text size="sm" fw={600}>
                  {project.client}
                </Text>
              </div>
            )}

            {project.dueDate && (
              <div>
                <Text size="xs" c="dimmed" fw={600} mb={4}>
                  Due
                </Text>
                <Text size="sm" fw={600}>
                  {project.dueDate}
                </Text>
              </div>
            )}

            <div>
              <Text size="xs" c="dimmed" fw={600} mb={4}>
                Team
              </Text>
              <Avatar.Group spacing="xs">
                {teamMembers.map((m) => (
                  <Tooltip key={m.id} label={m.name} withArrow>
                    <Avatar size="xs" radius="xl" color={m.color || "blue"}>
                      {m.name ? m.name[0].toUpperCase() : "?"}
                    </Avatar>
                  </Tooltip>
                ))}
              </Avatar.Group>
            </div>
          </Group>

          <Stack gap={4} mt="sm">
            <Text size="xs" c="dimmed" fw={600}>
              {progressPercent}% complete • {doneCount} of {projectTasks.length}{" "}
              tasks done • {projectFiles.length} documents
            </Text>
            <Progress
              value={progressPercent}
              color={project.colour || "blue"}
              size="md"
              radius="xl"
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Tasks Section */}
      <Paper p="xl" radius="md" withBorder>
        <Text fw={700} size="sm" tt="uppercase" c="dimmed" mb="md">
          TASKS
        </Text>

        {projectTasks.length === 0 ? (
          <Text size="sm" c="dimmed" fs="italic">
            No tasks created for this project yet.
          </Text>
        ) : (
          <Stack gap="xs">
            {projectTasks.map((t) => {
              const assignee = users.find((u) => u.id === t.assigneeId);
              return (
                <Paper
                  key={t.id}
                  p="sm"
                  radius="sm"
                  withBorder
                  style={{
                    cursor: "pointer",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                  }}
                  onClick={() => setActiveTaskId(t.id)}
                >
                  <Group justify="space-between">
                    <Group gap="md">
                      <Text size="xs" fw={700} c="dimmed">
                        {t.ref}
                      </Text>
                      <Text size="sm" fw={600}>
                        {t.title}
                      </Text>
                    </Group>

                    <Group gap="md">
                      {assignee && (
                        <Tooltip label={assignee.name}>
                          <Avatar
                            size="xs"
                            radius="xl"
                            color={assignee.color || "blue"}
                          >
                            {assignee.name[0].toUpperCase()}
                          </Avatar>
                        </Tooltip>
                      )}
                      <Badge
                        color={
                          t.status === "done"
                            ? "green"
                            : t.status === "in_progress"
                              ? "blue"
                              : "gray"
                        }
                        size="xs"
                      >
                        {t.status.replace("_", " ")}
                      </Badge>
                      <Progress
                        value={t.progress}
                        color="blue"
                        size="xs"
                        radius="xl"
                        style={{ width: 80 }}
                      />
                      <Text size="xs" c="dimmed">
                        {t.dueDate || "-"}
                      </Text>
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Documents Section */}
      <Paper p="xl" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={700} size="sm" tt="uppercase" c="dimmed">
            DOCUMENTS
          </Text>
          {user?.role !== "viewer" && (
            <Button
              leftSection={<IconPaperclip size={16} />}
              variant="outline"
              size="xs"
              color="blue"
              onClick={() => setUploadModalOpened(true)}
            >
              Share a document here
            </Button>
          )}
        </Group>

        {projectFiles.length === 0 ? (
          <Text size="sm" c="dimmed" fs="italic">
            No documents shared in this project yet.
          </Text>
        ) : (
          <Stack gap="xs">
            {projectFiles.map((f) => {
              const uploader = users.find((u) => u.id === f.uploadedBy);
              const isMedia =
                f.mime &&
                (f.mime.startsWith("image/") || f.mime === "application/pdf");

              return (
                <Paper
                  key={f.id}
                  p="xs"
                  radius="sm"
                  withBorder
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
                >
                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconFileText size={20} color="#5b8def" />
                      <div>
                        <Text size="sm" fw={600}>
                          {f.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {(f.size / 1024).toFixed(1)} KB • shared by{" "}
                          {uploader?.name || "Someone"}{" "}
                          {new Date(f.createdAt).toLocaleDateString()}
                        </Text>
                      </div>
                    </Group>

                    <Group gap="xs">
                      {isMedia && (
                        <Button
                          size="xs"
                          variant="default"
                          leftSection={<IconEye size={14} />}
                          onClick={() => setPreviewFile(f)}
                        >
                          Open
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant="default"
                        component="a"
                        href={`/api/files/${f.id}/download`}
                        target="_blank"
                        leftSection={<IconDownload size={14} />}
                      >
                        Download
                      </Button>
                      <Button
                        size="xs"
                        variant="default"
                        leftSection={<IconLink size={14} />}
                        onClick={() => handleCopyLink(f)}
                      >
                        Link
                      </Button>
                      {(user?.role === "admin" ||
                        f.uploadedBy === user?.id) && (
                        <Button
                          size="xs"
                          variant="subtle"
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          onClick={() => handleDeleteFile(f.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Project Discussion Section */}
      <Paper p="xl" radius="md" withBorder>
        <Text fw={700} size="sm" tt="uppercase" c="dimmed" mb="md">
          PROJECT DISCUSSION
        </Text>

        <Stack gap="xs" mb="lg">
          {comments.length === 0 ? (
            <Text size="sm" c="dimmed" fs="italic">
              No messages yet.
            </Text>
          ) : (
            comments.map((c) => {
              const author = users.find((u) => u.id === c.authorId);
              return (
                <Paper
                  key={c.id}
                  p="sm"
                  radius="md"
                  withBorder
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}
                >
                  <Group gap="xs" mb={4}>
                    <Avatar
                      size="xs"
                      color={author?.color || "blue"}
                      radius="xl"
                    >
                      {author?.name ? author.name[0].toUpperCase() : "?"}
                    </Avatar>
                    <Text size="xs" fw={700}>
                      {author?.name || "Unknown"}
                    </Text>
                    <Text size="10px" c="dimmed">
                      {new Date(c.createdAt).toLocaleString()}
                    </Text>
                  </Group>
                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                    {c.body}
                  </Text>
                </Paper>
              );
            })
          )}
        </Stack>

        <form onSubmit={handleAddComment}>
          <Stack gap="xs">
            <Textarea
              placeholder="Write a message... everyone involved gets a notification."
              minRows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.currentTarget.value)}
              variant="filled"
            />
            <Group justify="flex-end">
              <Button
                type="submit"
                color="blue"
                leftSection={<IconSend size={16} />}
              >
                Send
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      {/* Modals */}
      <ProjectModal
        project={project}
        opened={editProjectOpened}
        onClose={() => {
          setEditProjectOpened(false);
          loadDetails();
        }}
      />

      <TaskModal
        opened={createTaskOpened}
        onClose={() => {
          setCreateTaskOpened(false);
          loadDetails();
        }}
      />

      {/* Upload File Modal */}
      <Modal
        opened={uploadModalOpened}
        onClose={() => setUploadModalOpened(false)}
        title={<Text fw={700}>Share Document in Project</Text>}
        size={620}
        radius="lg"
      >
        <form onSubmit={handleUploadSubmit}>
          <Stack gap="md">
            <FileInput
              label="Choose files"
              placeholder="Select files to share"
              multiple
              value={selectedFiles}
              onChange={setSelectedFiles}
              required
            />
            <Button type="submit" color="blue" loading={uploading}>
              Share Document
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* Preview Modal */}
      {previewFile && (
        <Modal
          opened={!!previewFile}
          onClose={() => setPreviewFile(null)}
          title={<Text fw={700}>{previewFile.name}</Text>}
          size="xl"
        >
          {previewFile.mime && previewFile.mime.startsWith("image/") ? (
            <img
              src={`/api/files/${previewFile.id}/view`}
              alt={previewFile.name}
              style={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }}
            />
          ) : (
            <iframe
              src={`/api/files/${previewFile.id}/view`}
              title={previewFile.name}
              style={{ width: "100%", height: "70vh", border: "none" }}
            />
          )}
        </Modal>
      )}

      {/* Delete Project Confirmation Modal */}
      <Modal
        centered
        opened={deleteProjectModalOpened}
        onClose={() => setDeleteProjectModalOpened(false)}
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
            <Button variant="default" onClick={() => setDeleteProjectModalOpened(false)}>
              Cancel
            </Button>
            <Button color="red" loading={deletingProject} onClick={handleConfirmDeleteProject}>
              Delete Project
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
