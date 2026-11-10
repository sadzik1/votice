import { createBrowserRouter } from "react-router";
import { GuestOnly, RequireAuth } from "./components/AuthGuards.tsx";
import { Layout, PublicLayout } from "./components/Layout.tsx";
import { LoginPage, RegisterPage } from "./pages/AuthPages.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";
import { ResultsPage } from "./pages/ResultsPage.tsx";
import { SurveyEditorPage } from "./pages/SurveyEditorPage.tsx";
import { SurveysPage } from "./pages/SurveysPage.tsx";
import { TakeSurveyPage } from "./pages/TakeSurveyPage.tsx";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <GuestOnly />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: "surveys", element: <SurveysPage /> },
          { path: "surveys/:id", element: <SurveyEditorPage /> },
          { path: "surveys/:id/results", element: <ResultsPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    element: <PublicLayout />,
    children: [{ path: "s/:slug", element: <TakeSurveyPage /> }],
  },
]);
